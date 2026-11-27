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

  const { data: activePlan } = await admin
    .from("meal_plans")
    .select("id, name, target_kcal, total_kcal")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activePlan) {
    return NextResponse.json({ dateIst, plan: null, meals: [] });
  }

  const [{ data: items }, { data: tracking }] = await Promise.all([
    admin
      .from("meal_plan_items")
      .select("meal_no, food_name, qty, unit, kcal, protein_g")
      .eq("plan_id", activePlan.id)
      .eq("user_id", user.id)
      .order("meal_no", { ascending: true }),
    admin
      .from("daily_tracking")
      .select("meal_no, done")
      .eq("plan_id", activePlan.id)
      .eq("user_id", user.id)
      .eq("date_ist", dateIst),
  ]);

  const doneMap = new Map<number, boolean>();
  for (const t of tracking || []) {
    doneMap.set(Number(t.meal_no), Boolean(t.done));
  }

  const grouped = new Map<
    number,
    { meal_no: number; done: boolean; items: Array<{ food_name: string; qty: number; unit: string; kcal: number; protein_g: number }> }
  >();

  for (const it of items || []) {
    const mealNo = Number(it.meal_no) || 1;
    if (!grouped.has(mealNo)) {
      grouped.set(mealNo, {
        meal_no: mealNo,
        done: doneMap.get(mealNo) ?? false,
        items: [],
      });
    }
    grouped.get(mealNo)!.items.push({
      food_name: String(it.food_name),
      qty: Number(it.qty),
      unit: String(it.unit),
      kcal: Number(it.kcal),
      protein_g: Number(it.protein_g),
    });
  }

  return NextResponse.json({
    dateIst,
    plan: activePlan,
    meals: Array.from(grouped.values()).sort((a, b) => a.meal_no - b.meal_no),
  });
}

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const planId = String(body?.planId || "").trim();
  const mealNo = Number(body?.mealNo);
  const done = Boolean(body?.done);

  if (!planId || !Number.isFinite(mealNo)) {
    return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
  }

  const dateIst = getIstDateString();

  const { error } = await admin.from("daily_tracking").upsert(
    {
      user_id: user.id,
      plan_id: planId,
      date_ist: dateIst,
      meal_no: mealNo,
      done,
    },
    { onConflict: "user_id,plan_id,date_ist,meal_no" }
  );

  if (error) {
    console.error("[API /api/macros/tracking] Error:", error.message);
    return NextResponse.json({ error: "Failed to update tracking" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dateIst, mealNo, done });
}
