import { getRehabPrompt } from "./prompt";
import { cleanReply } from "@/lib/formatReply";

export interface ChatMessage {
  role: "user" | "model" | "assistant";
  text?: string;
  content?: string;
}

const DEFAULT_MODELS = [
  process.env.GROQ_MODEL_REHAB || "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

/**
 * Executes a chat completion for Rehab-Rishi using Groq models with automatic fallback.
 * Loads soul.md as the system prompt.
 */
export async function callGroqRehab(
  messages: ChatMessage[],
  overrideApiKey?: string,
  customModels?: string[],
  signal?: AbortSignal
): Promise<{ ok: boolean; status?: number; reply: string; responseTime: string; modelUsed?: string }> {
  const apiKey =
    overrideApiKey ||
    process.env.GROQ_API_KEY_REHAB ||
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      reply: "GROQ_API_KEY_REHAB is missing in .env.",
      responseTime: "0ms",
    };
  }

  const start = performance.now();
  const modelsToTry = Array.from(new Set((customModels || DEFAULT_MODELS).filter(Boolean)));
  const systemPrompt = getRehabPrompt();

  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m) => ({
      role: (m.role === "model" || m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: String(m.text || m.content || ""),
    })),
  ];

  let lastError = "All Groq model attempts failed for Rehab-Rishi.";
  let lastStatus = 500;

  for (const model of modelsToTry) {
    if (signal?.aborted) {
      return {
        ok: false,
        status: 408,
        reply: "Groq request timed out.",
        responseTime: `${Math.round(performance.now() - start)}ms`,
      };
    }

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
          temperature: 0.6,
        }),
        signal,
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        console.error(
          `[Groq] Upstream failure provider=groq model=${model} status=${res.status} body=${errorBody.slice(0, 200)}`
        );
        lastStatus = res.status;
        lastError = `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const cleaned = cleanReply(content);
        if (cleaned.trim()) {
          const elapsed = Math.round(performance.now() - start);
          const responseTime = elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`;
          return {
            ok: true,
            status: 200,
            reply: cleaned,
            responseTime,
            modelUsed: model,
          };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.error(`[Groq] Fetch error provider=groq model=${model} status=500 body=${msg.slice(0, 200)}`);
      lastStatus = signal?.aborted ? 408 : 500;
      lastError = msg;
      if (signal?.aborted) break;
    }
  }

  const elapsed = Math.round(performance.now() - start);
  return {
    ok: false,
    status: lastStatus,
    reply: `Groq Rehab-Rishi service error: ${lastError}`,
    responseTime: elapsed >= 1000 ? `${(elapsed / 1000).toFixed(2)}s` : `${elapsed}ms`,
  };
}
