import { getCodesPrompt } from "./prompt";
import { cleanReply } from "@/lib/formatReply";

export interface ChatMessage {
  role: "user" | "model" | "assistant";
  text?: string;
  content?: string;
}

const DEFAULT_MODELS = [
  process.env.GROQ_MODEL_DEXTER || "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Executes a chat completion for Dexter Codes using Groq models with automatic fallback.
 * Loads soul.md as the system prompt.
 */
export async function callGroqDexter(
  messages: ChatMessage[],
  overrideApiKey?: string,
  customModels?: string[]
): Promise<{ ok: boolean; reply: string; responseTime: string; modelUsed?: string }> {
  const apiKey =
    overrideApiKey ||
    process.env.GROQ_API_KEY_DEXTER ||
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      reply: "GROQ_API_KEY_DEXTER is missing in .env.",
      responseTime: "0ms",
    };
  }

  const start = performance.now();
  const modelsToTry = Array.from(new Set((customModels || DEFAULT_MODELS).filter(Boolean)));
  // Loads soul.md for Dexter Codes
  const systemPrompt = getCodesPrompt();

  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20).map((m) => ({
      role: (m.role === "model" || m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: String(m.text || m.content || ""),
    })),
  ];

  let lastError = "All Groq model attempts failed for Dexter Codes.";

  for (const model of modelsToTry) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: conversationMessages,
          temperature: 0.5,
        }),
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (!RETRYABLE_STATUSES.has(res.status)) continue;
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const elapsed = Math.round(performance.now() - start);
        const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
        return {
          ok: true,
          reply: cleanReply(content),
          responseTime,
          modelUsed: model,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
    }
  }

  const elapsed = Math.round(performance.now() - start);
  return {
    ok: false,
    reply: `Groq Dexter service error: ${lastError}`,
    responseTime: elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`,
  };
}
