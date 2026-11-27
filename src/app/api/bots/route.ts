import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { BOTS } from "@/lib/bots";

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("user_bots")
    .select("bot_id, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: true });

  if (error) {
    console.error("[API /api/bots GET] Error:", error.message);
    return NextResponse.json({ error: "Failed to load bots" }, { status: 500 });
  }

  return NextResponse.json({
    botIds: (data || []).map((r) => String(r.bot_id)),
  });
}

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const botId = typeof body?.botId === "string" ? body.botId.trim() : "";
  if (!BOTS.some((b) => b.id === botId)) {
    return NextResponse.json({ error: "Invalid botId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const { error } = await admin
    .from("user_bots")
    .upsert(
      { user_id: user.id, bot_id: botId },
      { onConflict: "user_id,bot_id", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[API /api/bots POST] Error:", error.message);
    return NextResponse.json({ error: "Failed to add bot" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, botId });
}

export async function DELETE(req: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryBotId = searchParams.get("botId");
  const body = await req.json().catch(() => null);
  const botId = (typeof body?.botId === "string" ? body.botId : queryBotId || "").trim();

  if (!botId) {
    return NextResponse.json({ error: "Missing botId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const { error } = await admin
    .from("user_bots")
    .delete()
    .eq("user_id", user.id)
    .eq("bot_id", botId);

  if (error) {
    console.error("[API /api/bots DELETE] Error:", error.message);
    return NextResponse.json({ error: "Failed to remove bot" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, botId });
}
