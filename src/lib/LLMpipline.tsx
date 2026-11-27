import fs from "fs";
import path from "path";
import { BOTS, LEVELS, type CustomBotConfig } from "@/lib/bots";
import { PROMPTS } from "@/lib/prompts";
import { generateWithFallback } from "@/lib/gemini";
import { cleanReply } from "@/lib/formatReply";
import { runSlashSkills } from "@/lib/skills";
import { calculateMeals, isOwnerUser, type ParsedMealLog } from "@/lib/calculateMacros";
import { MACROS_TOOLS, handleMacrosToolCall } from "@/bots/madrix-macros/tools";
import { callGroqMacroChief } from "@/bots/madrix-macros/groqMacro";
import { callGroqBhima } from "@/bots/bhima-coach/groqBhima";
import { callGroqDexter } from "@/bots/madrix-codes/groqDexter";
import { callGroqRehab } from "@/bots/madrix-rehab/groqRehab";

export type Msg = { role: "user" | "model"; text: string };
export type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } };

export type FallbackEvent = {
  stage: string;
  model: string;
  error: string;
  nextAction: string;
};

type GroqResult = {
  ok: boolean;
  status?: number;
  reply: string;
  responseTime: string;
  modelUsed?: string;
};

type GroqHandlerFn = (
  messages: Msg[],
  overrideApiKey?: string,
  customModels?: string[],
  signal?: AbortSignal
) => Promise<GroqResult>;

const GROQ_CONFIG: Record<
  string,
  {
    handler: GroqHandlerFn;
    envKeyName: string;
    modelEnvName: string;
    defaultModel: string;
  }
> = {
  "madrix-macros": {
    handler: callGroqMacroChief,
    envKeyName: "GROQ_API_KEY_MACROS",
    modelEnvName: "GROQ_MODEL_MACROS",
    defaultModel: "qwen/qwen3.8-27b",
  },
  "bhima-coach": {
    handler: callGroqBhima,
    envKeyName: "GROQ_API_KEY_BHIMA",
    modelEnvName: "GROQ_MODEL_BHIMA",
    defaultModel: "openai/gpt-oss-120b",
  },
  "madrix-codes": {
    handler: callGroqDexter,
    envKeyName: "GROQ_API_KEY_DEXTER",
    modelEnvName: "GROQ_MODEL_DEXTER",
    defaultModel: "openai/gpt-oss-20b",
  },
  "madrix-rehab": {
    handler: callGroqRehab,
    envKeyName: "GROQ_API_KEY_REHAB",
    modelEnvName: "GROQ_MODEL_REHAB",
    defaultModel: "openai/gpt-oss-120b",
  },
};

const PARSER_SOUL_PATH = path.join(process.cwd(), "src/bots/madrix-macros/macro_parser_soul.md");

async function tryHybridMacrosPipeline(
  userText: string,
  signal: AbortSignal,
  userId?: string | null
): Promise<{ handled: boolean; reply?: string; computedItems?: unknown[] }> {
  const apiKey = process.env.GROQ_API_KEY_MACROS || process.env.GROQ_API_KEY;
  if (!apiKey || !userText.trim()) return { handled: false };

  // Bypass hybrid fast-path for detailed explanations, DB updates, or multi-turn session edits
  if (
    /\b(detail|detailed|explain|describe|breakdown|why|add|update|save|change|edit|remove|delete|db|database)\b/i.test(
      userText
    )
  ) {
    return { handled: false };
  }

  let parserSoul = "";
  try {
    if (fs.existsSync(PARSER_SOUL_PATH)) {
      parserSoul = fs.readFileSync(PARSER_SOUL_PATH, "utf-8");
    }
  } catch {
    return { handled: false };
  }
  if (!parserSoul) return { handled: false };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0,
        include_reasoning: false,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: parserSoul },
          { role: "user", content: userText },
        ],
      }),
      signal,
    });

    if (!res.ok) {
      return { handled: false };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const rawJson = data?.choices?.[0]?.message?.content;
    if (!rawJson) return { handled: false };

    const parsed = JSON.parse(rawJson) as ParsedMealLog;
    const totalParsedItems = Array.isArray(parsed.meals)
      ? parsed.meals.reduce((acc, m) => acc + (Array.isArray(m.items) ? m.items.length : 0), 0)
      : 0;
    if (parsed.isNonMeal || !Array.isArray(parsed.meals) || totalParsedItems === 0) {
      return { handled: false };
    }

    const { markdown, unmatched, items } = await calculateMeals(parsed, userId);
    if (unmatched.length === 0 && items.length > 0) {
      return { handled: true, reply: markdown, computedItems: items };
    }
    if (unmatched.length === 0 && items.length === 0) {
      return { handled: false };
    }

    // Automatic routing rule for regular users: do not fall back to a guess
    if (userId && !isOwnerUser(userId)) {
      const missingMsg = unmatched
        .map((u) => `${u.name} is not in your table. Use /Add to enter it, or /Search to look it up.`)
        .join("\n");
      return { handled: true, reply: missingMsg };
    }

    // Owner keeps fallback to full Macro-Chief LLM if any food item is not in local .txt DBs
    return { handled: false };
  } catch {
    return { handled: false };
  }
}

function getCallSignal(globalSignal: AbortSignal): AbortSignal {
  return AbortSignal.any([globalSignal, AbortSignal.timeout(12_000)]);
}

function isRateLimitError(res: GroqResult): boolean {
  return res.status === 429 || /429|rate.?limit|too many/i.test(res.reply || "");
}

async function safeGroq(
  handler: GroqHandlerFn,
  messages: Msg[],
  signal: AbortSignal
): Promise<GroqResult> {
  try {
    return await handler(messages, undefined, undefined, signal);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code || (err instanceof Error ? err.name : "ERR");
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] Groq handler threw exception: ${code}: ${msg.slice(0, 200)}`);
    return {
      ok: false,
      status: 500,
      reply: `${code}: ${msg}`,
      responseTime: "0ms",
    };
  }
}

export function getBotCredentials(botId: string) {
  if (botId === "madrix-macros") {
    return {
      key: process.env.GEMINI_API_KEY_MACROS || process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL_MACROS || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      fallbackModel:
        process.env.GEMINI_FALLBACK_MODEL_MACROS ||
        process.env.GEMINI_FALLBACK_MODEL ||
        "gemini-3.1-flash-lite",
    };
  }
  if (botId === "bhima-coach") {
    return {
      key: process.env.GEMINI_API_KEY_BHIMA || process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL_BHIMA || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      fallbackModel:
        process.env.GEMINI_FALLBACK_MODEL_BHIMA ||
        process.env.GEMINI_FALLBACK_MODEL ||
        "gemini-3.1-flash-lite",
    };
  }
  return {
    key: process.env.GEMINI_API_KEY_CODES || process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL_CODES || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    fallbackModel:
      process.env.GEMINI_FALLBACK_MODEL_CODES ||
      process.env.GEMINI_FALLBACK_MODEL ||
      "gemini-3.1-flash-lite",
  };
}

export async function runLLMPipeline(params: {
  botId: unknown;
  messages: unknown;
  level: unknown;
  customConfig?: CustomBotConfig;
  userId?: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const apiStartTime = performance.now();
  const globalSignal = AbortSignal.timeout(50_000);
  const { botId, messages, level, customConfig, userId } = params;
  const owner = isOwnerUser(userId);
  const builtInBot = BOTS.find((b) => b.id === botId);
  if ((!builtInBot && !customConfig) || !Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: "bad request" } };
  }
  const bot = builtInBot ?? {
    id: String(botId),
    name: "Custom Bot",
  };

  const fallbackEvents: FallbackEvent[] = [];

  const deadlineExceeded = () => ({
    status: 200,
    body: {
      reply: "Servers are busy. Please try again in a minute.",
      fallbackEvents,
    },
  });

  // Resolve Gemini credentials early so nextAction strings can reference the real secondary model
  const creds = builtInBot
    ? getBotCredentials(builtInBot.id)
    : {
        key: customConfig?.apiKey || process.env.GEMINI_API_KEY,
        model: customConfig?.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        fallbackModel:
          customConfig?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
      };

  // Stage 0: Slash Skills (/Add, /verify-macros, /Update, /Search) routed before LLM
  if (bot.id === "madrix-macros") {
    if (globalSignal.aborted) return deadlineExceeded();
    try {
      const modelsToTry = Array.from(
        new Set([creds.model, creds.fallbackModel, "gemini-3.1-flash-lite"].filter(Boolean))
      );
      const skillResult = await runSlashSkills({
        messages: messages as Msg[],
        userId,
        geminiKey: creds.key,
        geminiModels: modelsToTry,
        signal: getCallSignal(globalSignal),
      });
      if (skillResult.handled) {
        const elapsed = Math.round(performance.now() - apiStartTime);
        const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
        return {
          status: 200,
          body: {
            reply: skillResult.reply,
            verified: Boolean(skillResult.verified),
            placeholderHint: skillResult.placeholderHint,
            responseTime,
            modelUsed: creds.model,
            fallbackEvents: [],
          },
        };
      }
    } catch (skillErr) {
      console.error("[Pipeline] slash skill failed, falling through to normal flow:", skillErr);
    }
  }

  // Stage 0.5: Hybrid Fast-Path for Macro-Chief (gpt-oss-20b JSON parser + TypeScript deterministic math)
  if (bot.id === "madrix-macros") {
    if (globalSignal.aborted) return deadlineExceeded();
    const lastUserText = [...(messages as Msg[])].reverse().find((m) => m.role === "user")?.text ?? "";
    const hybrid = await tryHybridMacrosPipeline(lastUserText, getCallSignal(globalSignal), userId);
    if (hybrid.handled && hybrid.reply) {
      const elapsed = Math.round(performance.now() - apiStartTime);
      const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
      return {
        status: 200,
        body: {
          reply: hybrid.reply,
          computedItems: hybrid.computedItems,
          responseTime,
          modelUsed: "openai/gpt-oss-20b+ts",
          fallbackEvents: [],
        },
      };
    }
  }

  // Stage 1 & 2: Table-driven Groq Primary + Conditional Retry
  const groqCfg = GROQ_CONFIG[bot.id];
  if (groqCfg && (process.env[groqCfg.envKeyName] || process.env.GROQ_API_KEY)) {
    if (globalSignal.aborted) return deadlineExceeded();

    const groqModelName = process.env[groqCfg.modelEnvName] || groqCfg.defaultModel;
    const groqHandler: GroqHandlerFn =
      bot.id === "madrix-macros"
        ? (msgs, key, models, sig) => callGroqMacroChief(msgs, key, models, sig, owner)
        : groqCfg.handler;
    let groqRes = await safeGroq(groqHandler, messages as Msg[], getCallSignal(globalSignal));

    if (groqRes.ok && groqRes.reply?.trim()) {
      return {
        status: 200,
        body: {
          reply: groqRes.reply,
          responseTime: groqRes.responseTime,
          modelUsed: groqRes.modelUsed || groqModelName,
          fallbackEvents,
        },
      };
    }

    if (isRateLimitError(groqRes)) {
      console.error(
        `[Pipeline] Groq rate-limited provider=groq model=${groqModelName} status=${groqRes.status ?? 429} body=${(groqRes.reply || "").slice(0, 200)}`
      );
      fallbackEvents.push({
        stage: "Groq (Primary)",
        model: groqModelName,
        error: groqRes.reply || "Rate limit (429)",
        nextAction: `Switching to Gemini Secondary (${creds.model})...`,
      });
    } else {
      fallbackEvents.push({
        stage: "Groq (Primary)",
        model: groqModelName,
        error: !groqRes.ok ? groqRes.reply : "Empty response",
        nextAction: "Retrying Groq...",
      });

      if (!globalSignal.aborted) {
        await new Promise((r) => setTimeout(r, 400));
        if (!globalSignal.aborted) {
          groqRes = await safeGroq(groqHandler, messages as Msg[], getCallSignal(globalSignal));
          if (groqRes.ok && groqRes.reply?.trim()) {
            return {
              status: 200,
              body: {
                reply: groqRes.reply,
                responseTime: groqRes.responseTime,
                modelUsed: groqRes.modelUsed || groqModelName,
                fallbackEvents,
              },
            };
          }
          fallbackEvents.push({
            stage: "Groq (Retry)",
            model: groqModelName,
            error: !groqRes.ok ? groqRes.reply : "Empty response on retry",
            nextAction: `Switching to Gemini Secondary (${creds.model})...`,
          });
        }
      }
    }
  }

  if (globalSignal.aborted) return deadlineExceeded();

  const { key, model, fallbackModel } = creds;
  if (!key || !model) {
    return {
      status: 200,
      body: {
        reply: `(${bot.name} demo reply) Add an API key in the bot settings or .env.local for real answers.`,
        fallbackEvents,
      },
    };
  }

  const contents = (messages as Msg[]).slice(-20).map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text).slice(0, 4000) }],
  }));
  while (contents[0]?.role === "model") contents.shift();

  const lv = (LEVELS as readonly string[]).includes(String(level)) ? String(level) : undefined;
  const modelsToTry = Array.from(new Set([model, fallbackModel, "gemini-3.1-flash-lite"].filter(Boolean)));

  const promptText = builtInBot
    ? PROMPTS[builtInBot.id] ?? ""
    : String(customConfig?.soul || "You are a helpful AI assistant.");
  const systemInstruction = { parts: [{ text: promptText }] };
  const supportsThinking = /gemini-2\.5|gemini-3/i.test(model);
  let generationConfig: Record<string, unknown> | undefined =
    lv && supportsThinking ? { thinkingConfig: { thinkingLevel: lv } } : undefined;
  const tools = bot.id === "madrix-macros" && owner ? MACROS_TOOLS : undefined;

  // Stage 3: Gemini Secondary
  let result = await generateWithFallback(
    [model],
    key,
    {
      systemInstruction,
      contents,
      ...(generationConfig ? { generationConfig } : {}),
      tools,
    },
    1,
    getCallSignal(globalSignal)
  );

  // If Gemini rejected thinkingConfig with 400, retry once without generationConfig
  if (!result.ok && result.status === 400 && /thinking/i.test(result.message) && generationConfig) {
    console.warn(`[Pipeline] Model ${model} rejected thinkingConfig (400); retrying without generationConfig.`);
    generationConfig = undefined;
    if (!globalSignal.aborted) {
      result = await generateWithFallback(
        [model],
        key,
        { systemInstruction, contents, tools },
        1,
        getCallSignal(globalSignal)
      );
    }
  }

  let finalModelUsed = model;

  // Stage 4: Global Fallback (gemini-3.1-flash-lite) if secondary fails
  if (!result.ok) {
    if (globalSignal.aborted) return deadlineExceeded();

    const fallbackTarget = fallbackModel || "gemini-3.1-flash-lite";
    fallbackEvents.push({
      stage: "Gemini (Secondary)",
      model,
      error: result.message || "Model failed / busy",
      nextAction: `Switching to Global Fallback (${fallbackTarget})...`,
    });

    result = await generateWithFallback(
      [fallbackModel, "gemini-3.1-flash-lite"],
      key,
      {
        systemInstruction,
        contents,
        ...(generationConfig ? { generationConfig } : {}),
        tools,
      },
      2,
      getCallSignal(globalSignal)
    );
    finalModelUsed = fallbackTarget;

    if (!result.ok) {
      if (globalSignal.aborted) return deadlineExceeded();
      fallbackEvents.push({
        stage: "Gemini (Global Fallback)",
        model: fallbackTarget,
        error: result.message || "Global fallback failed",
        nextAction: "All model fallbacks exhausted",
      });
      return {
        status: 200,
        body: {
          reply: "Servers are busy. Please try again in a minute.",
          error: result.message,
          fallbackEvents,
        },
      };
    }
  }

  const getParts = (data: Record<string, unknown>): GeminiPart[] => {
    const candidates = data.candidates as Array<{ content?: { parts?: GeminiPart[] } }> | undefined;
    return candidates?.[0]?.content?.parts ?? [];
  };

  let parts = getParts(result.data);

  const fnCallPart = parts.find((p) => p.functionCall);
  if (fnCallPart?.functionCall && bot.id === "madrix-macros") {
    if (globalSignal.aborted) return deadlineExceeded();

    let toolResult: Record<string, unknown>;
    try {
      toolResult = await handleMacrosToolCall(fnCallPart.functionCall.name, fnCallPart.functionCall.args);
    } catch (toolErr) {
      const msg = toolErr instanceof Error ? toolErr.message : "Tool execution failed";
      console.error("[Pipeline] handleMacrosToolCall threw exception:", msg);
      toolResult = { ok: false, message: "Saving isn't available on the hosted version." };
    }

    const followUpContents = [
      ...contents,
      { role: "model", parts },
      {
        role: "user",
        parts: [{ functionResponse: { name: fnCallPart.functionCall.name, response: toolResult } }],
      },
    ];

    result = await generateWithFallback(
      modelsToTry,
      key,
      {
        systemInstruction,
        contents: followUpContents,
        ...(generationConfig ? { generationConfig } : {}),
        tools,
      },
      2,
      getCallSignal(globalSignal)
    );

    if (!result.ok) {
      return {
        status: 200,
        body: {
          reply: globalSignal.aborted ? "Servers are busy. Please try again in a minute." : result.message,
          fallbackEvents,
        },
      };
    }
    parts = getParts(result.data);
  }

  const rawReply = parts.map((p) => p.text ?? "").join("");
  const reply = rawReply ? cleanReply(rawReply) : "No answer came back. Try again.";
  const elapsed = Math.round(performance.now() - apiStartTime);
  const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
  return {
    status: 200,
    body: {
      reply,
      responseTime,
      modelUsed: finalModelUsed,
      fallbackEvents,
    },
  };
}
