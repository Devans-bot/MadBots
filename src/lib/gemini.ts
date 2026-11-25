export type GeminiResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; message: string };

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini generateContent with model switching and up to `maxRetries` attempts.
 * Falls back across `models` on 503 / transient errors, and returns
 * "Server bandwidth is slow for now" if all attempts fail.
 */
export async function generateWithFallback(
  models: string[],
  apiKey: string,
  payload: Record<string, unknown>,
  maxRetries = 3
): Promise<GeminiResult> {
  const uniqueModels = Array.from(new Set(models.filter(Boolean)));
  let lastStatus = 503;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const model of uniqueModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          return { ok: true, data };
        }

        lastStatus = res.status;
        if (!RETRYABLE_STATUSES.has(res.status)) {
          return {
            ok: false,
            status: res.status,
            message: `The model returned an error (${res.status}). Check your key, model ID and thinking support.`,
          };
        }
      } catch {
        lastStatus = 503;
      }
    }

    if (attempt < maxRetries) {
      await sleep(600 * attempt);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    message: "Server bandwidth is slow for now",
  };
}
