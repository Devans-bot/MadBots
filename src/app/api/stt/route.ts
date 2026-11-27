import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { checkAndIncrementUsage } from "@/lib/usage";

export const maxDuration = 30;

function getGroqKey(): string | undefined {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEY_MACROS ||
    process.env.GROQ_API_KEY_BHIMA ||
    process.env.GROQ_API_KEY_DEXTER
  );
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    const usage = await checkAndIncrementUsage(user?.id ?? null);
    if (!usage.allowed) {
      return NextResponse.json({ error: usage.message }, { status: 429 });
    }

    const apiKey = getGroqKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    const formData = await req.formData().catch(() => null);
    const audioFile = formData?.get("audio");
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const groqForm = new FormData();
    groqForm.append("file", audioFile, "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqForm,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[STT] Groq error status=${res.status} body=${errText.slice(0, 200)}`);
      return NextResponse.json({ error: "Transcription failed" }, { status: res.status });
    }

    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (data.text || "").trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "STT error";
    console.error("[STT] Unhandled error:", msg);
    return NextResponse.json({ error: "Voice transcription failed. Please try again." }, { status: 500 });
  }
}
