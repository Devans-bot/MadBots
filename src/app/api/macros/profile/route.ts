import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  computeBmi,
  computeBmr,
  computeTdee,
  getBmiCategory,
  validateQuizInput,
  type ActivityLevel,
  type Gender,
} from "@/lib/macrosV2";

export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const [{ data: profile }, { data: activePlan }] = await Promise.all([
    admin.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    admin
      .from("meal_plans")
      .select("id, name, target_kcal, total_kcal, is_active, created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({ profile: profile || null, activePlan: activePlan || null });
}

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.mode === "custom" || body.mode === "default") {
    payload.mode = body.mode;
  }

  let bmiCategory: string | null = null;
  if (body.height_cm != null && body.weight_kg != null && body.age != null) {
    const heightCm = Number(body.height_cm);
    const weightKg = Number(body.weight_kg);
    const age = Number(body.age);
    const gender: Gender = body.gender === "female" ? "female" : "male";
    const activity: ActivityLevel = (
      ["sedentary", "light", "moderate", "very_active", "extra_active"].includes(
        String(body.activity_level)
      )
        ? body.activity_level
        : "moderate"
    ) as ActivityLevel;

    const validationErr = validateQuizInput({ heightCm, weightKg, age });
    if (validationErr) {
      return NextResponse.json({ error: validationErr }, { status: 400 });
    }

    const bmi = computeBmi(weightKg, heightCm);
    const bmr = computeBmr(weightKg, heightCm, age, gender);
    const tdee = computeTdee(bmr, activity);
    bmiCategory = getBmiCategory(bmi);

    Object.assign(payload, {
      height_cm: heightCm,
      weight_kg: weightKg,
      age,
      gender,
      activity_level: activity,
      bmi,
      bmr,
      tdee,
    });
  }

  if (typeof body.diet_type === "string") payload.diet_type = body.diet_type.trim();
  if (typeof body.allergies === "string") payload.allergies = body.allergies.trim();
  if (body.meals_per_day != null) payload.meals_per_day = Number(body.meals_per_day) || 3;

  const { data, error } = await admin
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[API /api/macros/profile] Error:", error.message);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data, bmiCategory });
}
