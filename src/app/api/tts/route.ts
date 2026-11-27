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

function toSpokenText(raw: string): string {
  // Strip code blocks, markdown tables, and formatting symbols into clean speakable text
  const withoutCode = raw.replace(/```[\s\S]*?```/g, " Code snippet provided. ");
  const withoutTables = withoutCode
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .join(" ");
  const cleaned = withoutTables
    .replace(/[*_`#|>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Keep within Orpheus free-tier per-request character budget (~195 chars)
  if (cleaned.length <= 195) return cleaned;
  return cleaned.slice(0, 192).trimEnd() + "...";
}

const VOICE_MAP: Record<string, string> = {
  "bhima-coach": "austin",
  "madrix-macros": "troy",
  "madrix-codes": "hannah",
  "madrix-rehab": "daniel",
};

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    const usage = await checkAndIncrementUsage(user?.id ?? null);
    if (!usage.allowed) {
      return NextResponse.json({ error: usage.message }, { status: 429 });
    }

    const apiKey = getGroqKey();
    if (!apiKey) {
      return NextResponse.json({ fallback: true, error: "No Groq API key" }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    const rawText = String(body?.text || "").trim().slice(0, 2000);
    const botId = String(body?.botId || "");
    const voice = VOICE_MAP[botId] || String(body?.voice || "troy");
    if (!rawText) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const spokenText = toSpokenText(rawText);
    if (!spokenText) {
      return NextResponse.json({ fallback: true }, { status: 200 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "canopylabs/orpheus-v1-english",
        voice,
        input: spokenText,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[TTS] Groq Orpheus error status=${res.status} body=${errText.slice(0, 200)}`);
      const needsTerms = /terms acceptance/i.test(errText);
      return NextResponse.json({ fallback: true, needsTerms }, { status: 200 });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS error";
    console.error("[TTS] Error, using browser fallback:", msg);
    return NextResponse.json({ fallback: true }, { status: 200 });
  }
}
