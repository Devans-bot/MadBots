import { getMacrosPrompt } from "./prompt";
import { handleMacrosToolCall } from "./tools";
import { cleanReply } from "@/lib/formatReply";

export interface ChatMessage {
  role: "user" | "model" | "assistant";
  text?: string;
  content?: string;
}

export interface GroqApiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export const GROQ_MACROS_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "update_personal_food_db",
      description:
        "Updates or adds a food item in personal_food_macros.txt. Always preserve existing entries, tracking rules, and formatting.",
      parameters: {
        type: "object",
        properties: {
          updatedContent: {
            type: "string",
            description: "The complete updated text content for personal_food_macros.txt",
          },
          summary: {
            type: "string",
            description: "Brief summary of the food item added or updated",
          },
        },
        required: ["updatedContent", "summary"],
      },
    },
  },
];

const DEFAULT_MODELS = [
  process.env.GROQ_MODEL_MACROS || "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function callGroqCompletion(
  model: string,
  apiKey: string,
  messages: GroqApiMessage[],
  tools?: typeof GROQ_MACROS_TOOLS
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature: 0.6,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, data };
    }

    const errorBody = await res.text();
    return {
      ok: false,
      status: res.status,
      error: `Groq error (${res.status}): ${errorBody}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Network error contacting Groq",
    };
  }
}

/**
 * Executes a chat completion for Macro-Chief using Groq models with automatic fallback.
 * Loads soul.md and reference databases as the system prompt.
 * Supports OpenAI-format function calling and cleans output formatting.
 */
export async function callGroqMacroChief(
  messages: ChatMessage[],
  overrideApiKey?: string,
  customModels?: string[]
): Promise<{ ok: boolean; reply: string; responseTime: string; modelUsed?: string }> {
  const apiKey =
    overrideApiKey ||
    process.env.GROQ_API_KEY_MACROS ||
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      reply: "GROQ_API_KEY_MACROS is missing in .env.",
      responseTime: "0ms",
    };
  }

  const start = performance.now();
  const modelsToTry = Array.from(new Set((customModels || DEFAULT_MODELS).filter(Boolean)));
  // Loads soul.md + personal_food_macros.txt + burger_king_selected_macros.txt
  const systemPrompt = getMacrosPrompt();

  const conversationMessages: GroqApiMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20).map((m) => ({
      role: (m.role === "model" || m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: String(m.text || m.content || ""),
    })),
  ];

  let lastError = "All Groq model attempts failed for Macro-Chief.";

  for (const model of modelsToTry) {
    const res = await callGroqCompletion(model, apiKey, conversationMessages, GROQ_MACROS_TOOLS);

    if (!res.ok) {
      lastError = res.error || `HTTP ${res.status}`;
      if (!RETRYABLE_STATUSES.has(res.status)) {
        continue;
      }
      continue;
    }

    const choice = res.data?.choices?.[0];
    const message = choice?.message;

    if (!message) {
      continue;
    }

    // Check if the model invoked any tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // failed parse
      }

      // Execute Macro-Chief tool locally
      const toolResult = handleMacrosToolCall(toolCall.function.name, toolArgs);

      const followUpMessages: GroqApiMessage[] = [
        ...conversationMessages,
        message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(toolResult),
        },
      ];

      // Send tool result back to Groq for final formatted answer
      const followUpRes = await callGroqCompletion(model, apiKey, followUpMessages);
      if (followUpRes.ok) {
        const finalMessage = followUpRes.data?.choices?.[0]?.message?.content || "";
        const elapsed = Math.round(performance.now() - start);
        const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
        return {
          ok: true,
          reply: cleanReply(finalMessage),
          responseTime,
          modelUsed: model,
        };
      }
    }

    const rawText = message.content || "";
    const elapsed = Math.round(performance.now() - start);
    const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
    return {
      ok: true,
      reply: cleanReply(rawText),
      responseTime,
      modelUsed: model,
    };
  }

  const elapsed = Math.round(performance.now() - start);
  return {
    ok: false,
    reply: `Groq Macro-Chief service error: ${lastError}`,
    responseTime: elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`,
  };
}
