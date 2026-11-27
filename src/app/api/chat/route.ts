import { NextResponse } from "next/server";
import { runLLMPipeline, type FallbackEvent } from "@/lib/LLMpipline";
import { getServerUser } from "@/lib/supabase/server";
import { checkAndIncrementUsage } from "@/lib/usage";

export const maxDuration = 60;

export type { FallbackEvent };

const MAX_MESSAGE_CHARS = 2000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const user = await getServerUser();
    const { botId, messages, level, customConfig } = body as Record<string, unknown>;

    if (Array.isArray(messages) && messages.length > 0) {
      const lastMsg = messages[messages.length - 1] as { text?: unknown } | undefined;
      if (typeof lastMsg?.text === "string" && lastMsg.text.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json(
          { error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters).` },
          { status: 400 }
        );
      }
    }

    const usage = await checkAndIncrementUsage(user?.id ?? null);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: usage.message, reply: usage.message, limitReached: true },
        { status: 429 }
      );
    }

    const { status, body: resultBody } = await runLLMPipeline({
      botId,
      messages,
      level,
      customConfig: customConfig as Parameters<typeof runLLMPipeline>[0]["customConfig"],
      userId: user?.id ?? null,
    });
    return NextResponse.json(resultBody, { status });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code || (err instanceof Error ? err.name : "INTERNAL_ERROR");
    console.error(`[API /api/chat] Unhandled error (${code}):`, err);
    return NextResponse.json(
      { error: "Unable to process your request right now. Please try again." },
      { status: 500 }
    );
  }
}
