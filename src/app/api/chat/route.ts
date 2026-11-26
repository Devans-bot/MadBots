import { NextResponse } from "next/server";
import { runLLMPipeline, type FallbackEvent } from "@/lib/LLMpipline";

export const maxDuration = 60;

export type { FallbackEvent };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { botId, messages, level, customConfig } = body as Record<string, unknown>;
    const { status, body: resultBody } = await runLLMPipeline({
      botId,
      messages,
      level,
      customConfig: customConfig as Parameters<typeof runLLMPipeline>[0]["customConfig"],
    });
    return NextResponse.json(resultBody, { status });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code || (err instanceof Error ? err.name : "INTERNAL_ERROR");
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    console.error(`[API /api/chat] Unhandled error (${code}):`, err);
    return NextResponse.json({ error: `${code}: ${msg}` }, { status: 500 });
  }
}
