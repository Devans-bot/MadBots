import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getIstDateString } from "@/lib/macrosV2";

export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const dateIst = getIstDateString();
  const { data, error } = await admin
    .from("user_meal_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("date_ist", dateIst)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[API /api/macros/log GET] Error:", error.message);
    return NextResponse.json({ error: "Failed to load meal log" }, { status: 500 });
  }

  return NextResponse.json({ dateIst, logs: data || [] });
}

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "No items to log" }, { status: 400 });
  }

  const dateIst = getIstDateString();
  const rows = items.map((it: Record<string, unknown>) => ({
    user_id: user.id,
    date_ist: dateIst,
    meal_label: String(it.meal_label || `Meal ${it.meal || 1}`),
    food_name: String(it.name || it.food_name || "Food"),
    qty: Number(it.qty) || 1,
    unit: String(it.unit || "g"),
    grams: it.unit === "g" || it.unit === "ml" ? Number(it.qty) : null,
    kcal: Number(it.kcal) || 0,
    protein_g: Number(it.protein ?? it.protein_g) || 0,
    carbs_g: it.carbs != null ? Number(it.carbs) : null,
    fat_g: it.fat != null ? Number(it.fat) : null,
  }));

  const { error } = await admin.from("user_meal_log").insert(rows);
  if (error) {
    console.error("[API /api/macros/log POST] Error:", error.message);
    return NextResponse.json({ error: "Failed to log meal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dateIst, count: rows.length });
}
