import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  clearMacroDbCache,
  computeItemMacros,
  findFoodMatch,
  loadUserFoodsDb,
} from "@/lib/calculateMacros";
import { BRAND_SENSITIVE_KEYWORDS, clampTargetKcal } from "@/lib/macrosV2";

interface PlanItemInput {
  meal_no: number;
  name: string;
  qty: number;
  unit: "g" | "ml" | "count";
}

interface ComputedPlanItem extends PlanItemInput {
  food_name: string;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number | null;
  fat_g: number | null;
}

async function generatePlanJson(params: {
  foodNames: string[];
  targetKcal: number;
  dietType: string;
  allergies: string;
  mealsPerDay: number;
  goalNotes: string;
  retryFeedback?: string;
}): Promise<{ meals: Array<{ meal_no: number; items: Array<{ name: string; qty: number; unit: "g" | "ml" | "count" }> }> } | null> {
  const groqKey = process.env.GROQ_API_KEY_MACROS || process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const systemPrompt = `You are a diet plan generator. Return ONLY valid JSON.
Allowed food names (use ONLY exact names from this list):
${params.foodNames.slice(0, 120).join(", ")}

Rules:
- Create ${params.mealsPerDay} meals totaling ~${params.targetKcal} kcal.
- Diet type: ${params.dietType || "balanced"}.
- Allergies/restrictions: ${params.allergies || "none"}.
- Notes/goal: ${params.goalNotes || "maintenance"}.
${params.retryFeedback ? `- IMPORTANT FIX NEEDED: ${params.retryFeedback}` : ""}
- Output JSON schema:
{
  "meals": [
    {
      "meal_no": 1,
      "items": [{ "name": "exact food name", "qty": 100, "unit": "g" }]
    }
  ]
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
      include_reasoning: false,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the meal plan JSON now." },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const action = body?.action as string;

  // 1. Save a confirmed plan
  if (action === "save") {
    const planName = String(body?.name || "My Diet Plan").trim();
    const targetKcal = Number(body?.target_kcal) || 0;
    const items = Array.isArray(body?.items) ? (body.items as ComputedPlanItem[]) : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Plan has no items to save." }, { status: 400 });
    }

    const totalKcal = Math.round(items.reduce((acc, it) => acc + (Number(it.kcal) || 0), 0));

    // Deactivate older plans
    await admin
      .from("meal_plans")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data: planRow, error: planErr } = await admin
      .from("meal_plans")
      .insert({
        user_id: user.id,
        name: planName,
        target_kcal: targetKcal || totalKcal,
        total_kcal: totalKcal,
        is_active: true,
      })
      .select("*")
      .single();

    if (planErr || !planRow) {
      console.error("[API /api/macros/plan save] Error:", planErr?.message);
      return NextResponse.json({ error: "Failed to save meal plan" }, { status: 500 });
    }

    const rowsToInsert = items.map((it) => ({
      plan_id: planRow.id,
      user_id: user.id,
      meal_no: Number(it.meal_no) || 1,
      food_name: String(it.food_name || it.name),
      qty: Number(it.qty) || 1,
      unit: String(it.unit || "g"),
      grams: it.grams != null ? Number(it.grams) : null,
      kcal: Number(it.kcal) || 0,
      protein_g: Number(it.protein_g) || 0,
      carbs_g: it.carbs_g != null ? Number(it.carbs_g) : null,
      fat_g: it.fat_g != null ? Number(it.fat_g) : null,
    }));

    const { error: itemsErr } = await admin.from("meal_plan_items").insert(rowsToInsert);
    if (itemsErr) {
      console.error("[API /api/macros/plan items] Error:", itemsErr.message);
      return NextResponse.json({ error: "Failed to save plan items" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, plan: planRow, items: rowsToInsert });
  }

  // 2. Copy a chosen brand item from food_common into user_foods
  if (action === "choose_brand") {
    const commonId = String(body?.foodCommonId || "").trim();
    if (!commonId) return NextResponse.json({ error: "Missing foodCommonId" }, { status: 400 });

    const { data: fc } = await admin
      .from("food_common")
      .select("*")
      .eq("id", commonId)
      .maybeSingle();
    if (!fc) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    await admin.from("user_foods").upsert(
      {
        user_id: user.id,
        food_common_id: fc.id,
        display_name: fc.name,
        kcal_per_100g: fc.kcal_per_100g,
        protein_per_100g: fc.protein_per_100g,
        carbs_per_100g: fc.carbs_per_100g,
        fibre_per_100g: fc.fibre_per_100g,
        fat_per_100g: fc.fat_per_100g,
        serving_g: fc.serving_g,
        serving_ml: fc.serving_ml,
        grams_per_piece: fc.grams_per_piece,
        source: "brand",
        count_staple_protein: false,
      },
      { onConflict: "user_id,display_name" }
    );
    clearMacroDbCache(user.id);
    return NextResponse.json({ ok: true, addedName: fc.name });
  }

  // 3. Generate a new plan in code + LLM item selection
  if (action === "generate") {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const tdee = Number(profile?.tdee) || 2200;
    const goalNotes = String(body?.goalNotes || "");
    const targetKcal = clampTargetKcal(tdee, goalNotes);
    const dietType = String(body?.dietType || profile?.diet_type || "balanced");
    const allergies = String(body?.allergies || profile?.allergies || "");
    const mealsPerDay = Number(body?.mealsPerDay || profile?.meals_per_day || 4);

    const db = await loadUserFoodsDb(user.id);
    const foodNames = Array.from(db.values()).map((e) => e.name);
    if (foodNames.length === 0) {
      return NextResponse.json(
        { error: "Your food table is empty. Add foods first using /Add." },
        { status: 400 }
      );
    }

    let retryFeedback: string | undefined;
    let finalItems: ComputedPlanItem[] = [];
    let totalKcal = 0;
    let totalProtein = 0;

    for (let attempt = 0; attempt < 2; attempt++) {
      const gen = await generatePlanJson({
        foodNames,
        targetKcal,
        dietType,
        allergies,
        mealsPerDay,
        goalNotes,
        retryFeedback,
      });

      if (!gen || !Array.isArray(gen.meals)) continue;

      const computed: ComputedPlanItem[] = [];
      let sumKcal = 0;
      let sumProt = 0;

      for (const m of gen.meals) {
        const mealNo = Number(m.meal_no) || 1;
        for (const rawIt of m.items || []) {
          const entry = findFoodMatch(db, rawIt.name);
          if (!entry) continue;
          const qty = Number(rawIt.qty) || 100;
          const unit = rawIt.unit || "g";
          const calc = computeItemMacros(entry, qty, unit);
          sumKcal += calc.kcal;
          sumProt += calc.protein;

          computed.push({
            meal_no: mealNo,
            name: entry.name,
            food_name: entry.name,
            qty,
            unit,
            grams: unit === "g" || unit === "ml" ? qty : null,
            kcal: Math.round(calc.kcal),
            protein_g: Math.round(calc.protein * 10) / 10,
            carbs_g: calc.carbs != null ? Math.round(calc.carbs * 10) / 10 : null,
            fat_g: calc.fat != null ? Math.round(calc.fat * 10) / 10 : null,
          });
        }
      }

      finalItems = computed;
      totalKcal = Math.round(sumKcal);
      totalProtein = Math.round(sumProt * 10) / 10;

      const diffPct = Math.abs(totalKcal - targetKcal) / targetKcal;
      if (diffPct <= 0.05 && finalItems.length > 0) {
        break;
      }
      retryFeedback = `Previous total was ${totalKcal} kcal, but target is ${targetKcal} kcal (must be within 5%). Adjust quantities.`;
    }

    if (finalItems.length === 0) {
      return NextResponse.json(
        { error: "Could not generate a valid plan from your food table. Please try again." },
        { status: 500 }
      );
    }

    const rows = finalItems.map(
      (it) =>
        `| Meal ${it.meal_no} | ${it.food_name} | ${it.qty} ${it.unit} | ${it.kcal} kcal | ${it.protein_g} g |`
    );
    const markdown = [
      `### Custom Diet Plan (Target: ${targetKcal} kcal)`,
      `| Meal | Food | Qty | Calories | Protein |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
      ...rows,
      "",
      `**Total:** ${totalKcal} kcal | ${totalProtein} g protein`,
    ].join("\n");

    return NextResponse.json({
      targetKcal,
      totalKcal,
      totalProtein,
      items: finalItems,
      markdown,
    });
  }

  // 4. Parse an existing pasted plan
  if (action === "parse_existing") {
    const pastedText = String(body?.text || "").trim();
    if (!pastedText) {
      return NextResponse.json({ error: "Please paste your existing diet plan." }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY_MACROS || process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: "Parser unavailable" }, { status: 500 });

    const parseRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0,
        include_reasoning: false,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Parse the pasted meal plan into strict JSON: { "meals": [{ "meal": 1, "items": [{ "name": "food", "qty": 100, "unit": "g" }] }] }. Units: "g", "ml", or "count".',
          },
          { role: "user", content: pastedText },
        ],
      }),
    });

    if (!parseRes.ok) {
      return NextResponse.json({ error: "Failed to parse plan." }, { status: 500 });
    }

    const pData = (await parseRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = pData?.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ error: "Empty parse result." }, { status: 500 });

    const parsed = JSON.parse(raw) as {
      meals?: Array<{ meal: number; items: Array<{ name: string; qty: number; unit: "g" | "ml" | "count" }> }>;
    };

    const db = await loadUserFoodsDb(user.id);
    const brandPrompts: Array<{
      itemName: string;
      options: Array<{ id: string; name: string; brand: string | null }>;
    }> = [];
    const missingItems: string[] = [];
    const computed: ComputedPlanItem[] = [];

    for (const grp of parsed.meals || []) {
      const mealNo = Number(grp.meal) || 1;
      for (const it of grp.items || []) {
        const lower = String(it.name || "").toLowerCase().trim();
        const isGenericBrandSensitive =
          BRAND_SENSITIVE_KEYWORDS.some((kw) => lower === kw) && !body?.skipBrandCheck;

        if (isGenericBrandSensitive) {
          const { data: brandOpts } = await admin
            .from("food_common")
            .select("id, name, brand")
            .ilike("name", `%${lower}%`)
            .limit(6);

          if (brandOpts && brandOpts.length > 0) {
            brandPrompts.push({ itemName: it.name, options: brandOpts });
            continue;
          }
        }

        const entry = findFoodMatch(db, it.name);
        if (!entry) {
          missingItems.push(it.name);
          continue;
        }

        const qty = Number(it.qty) || 100;
        const unit = it.unit || "g";
        const calc = computeItemMacros(entry, qty, unit);
        computed.push({
          meal_no: mealNo,
          name: entry.name,
          food_name: entry.name,
          qty,
          unit,
          grams: unit === "g" || unit === "ml" ? qty : null,
          kcal: Math.round(calc.kcal),
          protein_g: Math.round(calc.protein * 10) / 10,
          carbs_g: calc.carbs != null ? Math.round(calc.carbs * 10) / 10 : null,
          fat_g: calc.fat != null ? Math.round(calc.fat * 10) / 10 : null,
        });
      }
    }

    if (brandPrompts.length > 0) {
      return NextResponse.json({ needsBrandSelection: true, brandPrompts });
    }

    if (missingItems.length > 0) {
      return NextResponse.json({
        missingItems,
        message: missingItems
          .map((n) => `${n} is not in your table. Use /Add to enter it, or /Search to look it up.`)
          .join("\n"),
      });
    }

    const totalKcal = Math.round(computed.reduce((a, b) => a + b.kcal, 0));
    const totalProtein = Math.round(computed.reduce((a, b) => a + b.protein_g, 0) * 10) / 10;

    return NextResponse.json({
      items: computed,
      totalKcal,
      totalProtein,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
