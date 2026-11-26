export type GeminiResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; message: string };

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini generateContent with model switching and up to `maxRetries` attempts.
 * Falls back across `models` on 503 / transient errors, skips 429 rate-limited models on retries,
 * and respects an optional AbortSignal.
 */
export async function generateWithFallback(
  models: string[],
  apiKey: string,
  payload: Record<string, unknown>,
  maxRetries = 3,
  signal?: AbortSignal
): Promise<GeminiResult> {
  const uniqueModels = Array.from(new Set(models.filter(Boolean)));
  const rateLimitedModels = new Set<string>();
  let lastStatus = 503;
  let lastMessage = "Server bandwidth is slow for now";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      return { ok: false, status: 408, message: "Request timed out." };
    }

    for (const model of uniqueModels) {
      if (signal?.aborted) {
        return { ok: false, status: 408, message: "Request timed out." };
      }
      if (rateLimitedModels.has(model)) {
        continue;
      }

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(payload),
            signal,
          }
        );

        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          return { ok: true, data };
        }

        const errText = await res.text().catch(() => "");
        console.error(
          `[Gemini] Upstream failure provider=gemini model=${model} status=${res.status} body=${errText.slice(0, 200)}`
        );

        lastStatus = res.status;
        if (res.status === 429) {
          rateLimitedModels.add(model);
          lastMessage = `Rate limited (${res.status}) on ${model}`;
          continue;
        }

        if (!RETRYABLE_STATUSES.has(res.status)) {
          return {
            ok: false,
            status: res.status,
            message: `The model returned an error (${res.status}). ${errText.slice(0, 120)}`.trim(),
          };
        }
      } catch (err) {
        if (signal?.aborted) {
          return { ok: false, status: 408, message: "Request timed out." };
        }
        const msg = err instanceof Error ? err.message : "Network error";
        console.error(`[Gemini] Fetch error provider=gemini model=${model} status=503 body=${msg.slice(0, 200)}`);
        lastStatus = 503;
      }
    }

    if (attempt < maxRetries && !signal?.aborted) {
      await sleep(600 * attempt);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    message: lastMessage,
  };
}
