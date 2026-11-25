import { NextResponse } from "next/server";
import { BOTS, LEVELS } from "@/lib/bots";
import { PROMPTS } from "@/lib/prompts";
import { generateWithFallback } from "@/lib/gemini";
import { cleanReply } from "@/lib/formatReply";
import { runVerifyMacrosSkill } from "@/lib/skills";
import { MACROS_TOOLS, handleMacrosToolCall } from "@/bots/madrix-macros/tools";
import { callGroqMacroChief } from "@/bots/madrix-macros/groqMacro";
import { callGroqBhima } from "@/bots/bhima-coach/groqBhima";
import { callGroqDexter } from "@/bots/madrix-codes/groqDexter";

type Msg = { role: "user" | "model"; text: string };
type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } };

function getBotCredentials(botId: string) {
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

export async function POST(req: Request) {
  const apiStartTime = performance.now();
  const { botId, messages, level, customConfig } = await req.json();
  const builtInBot = BOTS.find((b) => b.id === botId);
  if ((!builtInBot && !customConfig) || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const bot = builtInBot ?? {
    id: String(botId),
    name: "Custom Bot",
  };

  // Route to Groq if key is present for built-in agents
  if (bot.id === "madrix-macros" && (process.env.GROQ_API_KEY_MACROS || process.env.GROQ_API_KEY)) {
    const groqRes = await callGroqMacroChief(messages as Msg[]);
    if (groqRes.ok) {
      return NextResponse.json({ reply: groqRes.reply, responseTime: groqRes.responseTime });
    }
  }

  if (bot.id === "bhima-coach" && (process.env.GROQ_API_KEY_BHIMA || process.env.GROQ_API_KEY)) {
    const groqRes = await callGroqBhima(messages as Msg[]);
    if (groqRes.ok) {
      return NextResponse.json({ reply: groqRes.reply, responseTime: groqRes.responseTime });
    }
  }

  if (bot.id === "madrix-codes" && (process.env.GROQ_API_KEY_DEXTER || process.env.GROQ_API_KEY)) {
    const groqRes = await callGroqDexter(messages as Msg[]);
    if (groqRes.ok) {
      return NextResponse.json({ reply: groqRes.reply, responseTime: groqRes.responseTime });
    }
  }

  const creds = builtInBot
    ? getBotCredentials(builtInBot.id)
    : {
        key: customConfig?.apiKey || process.env.GEMINI_API_KEY,
        model: customConfig?.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        fallbackModel:
          customConfig?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
      };
  const { key, model, fallbackModel } = creds;
  if (!key || !model) {
    return NextResponse.json({
      reply: `(${bot.name} demo reply) Add an API key in the bot settings or .env.local for real answers.`,
    });
  }

  const contents = (messages as Msg[]).slice(-20).map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text).slice(0, 4000) }],
  }));
  while (contents[0]?.role === "model") contents.shift();

  const lv = (LEVELS as readonly string[]).includes(level) ? level : undefined;
  const modelsToTry = Array.from(new Set([model, fallbackModel, "gemini-3.1-flash-lite"].filter(Boolean)));

  if (bot.id === "madrix-macros") {
    const skillResult = await runVerifyMacrosSkill(messages as Msg[], key, modelsToTry);
    if (skillResult.handled) {
      return NextResponse.json({
        reply: skillResult.reply,
        verified: Boolean(skillResult.verified),
      });
    }
  }

  const promptText = builtInBot
    ? PROMPTS[builtInBot.id] ?? ""
    : String(customConfig?.soul || "You are a helpful AI assistant.");
  const systemInstruction = { parts: [{ text: promptText }] };
  const generationConfig = lv ? { thinkingConfig: { thinkingLevel: lv } } : undefined;
  const tools = bot.id === "madrix-macros" ? MACROS_TOOLS : undefined;

  let result = await generateWithFallback(modelsToTry, key, {
    systemInstruction,
    contents,
    generationConfig,
    tools,
  });

  if (!result.ok) {
    return NextResponse.json({ reply: result.message });
  }

  const getParts = (data: Record<string, unknown>): GeminiPart[] => {
    const candidates = data.candidates as Array<{ content?: { parts?: GeminiPart[] } }> | undefined;
    return candidates?.[0]?.content?.parts ?? [];
  };

  let parts = getParts(result.data);

  const fnCallPart = parts.find((p) => p.functionCall);
  if (fnCallPart?.functionCall && bot.id === "madrix-macros") {
    const toolResult = handleMacrosToolCall(
      fnCallPart.functionCall.name,
      fnCallPart.functionCall.args
    );

    const followUpContents = [
      ...contents,
      { role: "model", parts },
      {
        role: "user",
        parts: [{ functionResponse: { name: fnCallPart.functionCall.name, response: toolResult } }],
      },
    ];

    result = await generateWithFallback(modelsToTry, key, {
      systemInstruction,
      contents: followUpContents,
      generationConfig,
      tools,
    });

    if (!result.ok) {
      return NextResponse.json({ reply: result.message });
    }
    parts = getParts(result.data);
  }

  const rawReply = parts.map((p) => p.text ?? "").join("");
  const reply = rawReply ? cleanReply(rawReply) : "No answer came back. Try again.";
  const elapsed = Math.round(performance.now() - apiStartTime);
  const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
  return NextResponse.json({ reply, responseTime });
}
