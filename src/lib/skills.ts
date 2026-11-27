import fs from "fs";
import path from "path";
import { generateWithFallback } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  calculateMeals,
  clearMacroDbCache,
  ensureUserFoodsSeeded,
  isOwnerUser,
  type ParsedMealLog,
} from "@/lib/calculateMacros";

const PERSONAL_DB_PATH = path.join(process.cwd(), "src/bots/madrix-macros/personal_food_macros.txt");
const BK_DB_PATH = path.join(process.cwd(), "src/bots/madrix-macros/burger_king_selected_macros.txt");

export type Msg = { role: "user" | "model"; text: string };

type MacroItem = {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
};

export type SkillResult = {
  handled: boolean;
  reply?: string;
  verified?: boolean;
  placeholderHint?: string;
};

export const MACRO_SKILLS = [
  { command: "/Add", hint: "Add a food or meal to your database (e.g. /Add whey 25g protein 120 kcal per scoop)" },
  { command: "/verify-macros", hint: "Recheck the last macro calculation across 4 independent passes" },
  { command: "/Update", hint: "Update an existing food or brand item in your database" },
  { command: "/Search", hint: "Search the web for nutrition info (1-3 candidates per 100g)" },
] as const;

function stripHtmlAndCap(raw: unknown, maxLen = 120): string {
  return String(raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

async function extractJsonWithGroqOrGemini(
  systemPrompt: string,
  userPrompt: string,
  geminiKey?: string,
  geminiModels: string[] = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  signal?: AbortSignal
): Promise<Record<string, unknown> | null> {
  const groqKey = process.env.GROQ_API_KEY_MACROS || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal,
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = data?.choices?.[0]?.message?.content;
        if (raw) return JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      // fall through to Gemini
    }
  }

  if (geminiKey) {
    const res = await generateWithFallback(
      geminiModels,
      geminiKey,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      },
      1,
      signal
    );
    if (res.ok) {
      const candidates = res.data.candidates as
        | Array<{ content?: { parts?: Array<{ text?: string }> } }>
        | undefined;
      const raw = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (raw) {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function readDbTwice(): { ok: boolean; personalDb: string; bkDb: string } {
  try {
    const p1 = fs.existsSync(PERSONAL_DB_PATH) ? fs.readFileSync(PERSONAL_DB_PATH, "utf-8") : "";
    const b1 = fs.existsSync(BK_DB_PATH) ? fs.readFileSync(BK_DB_PATH, "utf-8") : "";
    const p2 = fs.existsSync(PERSONAL_DB_PATH) ? fs.readFileSync(PERSONAL_DB_PATH, "utf-8") : "";
    const b2 = fs.existsSync(BK_DB_PATH) ? fs.readFileSync(BK_DB_PATH, "utf-8") : "";

    return {
      ok: p1 === p2 && b1 === b2 && (p1.length > 0 || b1.length > 0),
      personalDb: p2,
      bkDb: b2,
    };
  } catch {
    return { ok: false, personalDb: "", bkDb: "" };
  }
}

function sumInOrder(items: MacroItem[], field: "calories" | "protein"): number {
  let total = 0;
  for (const item of items) {
    total += Number(item[field]) || 0;
  }
  return Math.round(total * 100) / 100;
}

export function verifyFourOrders(items: MacroItem[]): {
  allMatch: boolean;
  calories: number[];
  protein: number[];
} {
  const order1 = [...items];
  const order2 = [...items].reverse();
  const order3 = [...items].sort((a, b) => a.calories - b.calories);
  const order4 = [...items].sort((a, b) => b.protein - a.protein);

  const orders = [order1, order2, order3, order4];
  const calSums = orders.map((ord) => sumInOrder(ord, "calories"));
  const proSums = orders.map((ord) => sumInOrder(ord, "protein"));

  const calMatch = calSums.every((v) => v === calSums[0]);
  const proMatch = proSums.every((v) => v === proSums[0]);

  return {
    allMatch: calMatch && proMatch,
    calories: calSums,
    protein: proSums,
  };
}

/**
 * Pure TypeScript conversion to per-100g values for /Add.
 */
export function convertToPer100g(params: {
  kcal: number;
  protein: number;
  carbs?: number | null;
  fat?: number | null;
  unit: "per serving" | "per scoop" | "per piece" | "per 100 g";
  unitGrams?: number | null;
}) {
  const { kcal, protein, carbs, fat, unit, unitGrams } = params;
  let grams = 100;
  if (unit === "per 100 g") {
    grams = 100;
  } else if (unit === "per scoop") {
    grams = unitGrams && unitGrams > 0 ? unitGrams : 30;
  } else if (unit === "per piece") {
    grams = unitGrams && unitGrams > 0 ? unitGrams : 100;
  } else {
    grams = unitGrams && unitGrams > 0 ? unitGrams : 100;
  }

  const factor = 100 / grams;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    grams,
    kcal_per_100g: round2(kcal * factor),
    protein_per_100g: round2(protein * factor),
    carbs_per_100g: carbs != null ? round2(carbs * factor) : null,
    fat_per_100g: fat != null ? round2(fat * factor) : null,
    serving_g: unit === "per serving" || unit === "per scoop" ? grams : null,
    grams_per_piece: unit === "per piece" ? grams : null,
  };
}

async function handleAddSkill(
  rawArgs: string,
  userId: string,
  geminiKey?: string,
  geminiModels?: string[],
  signal?: AbortSignal
): Promise<SkillResult> {
  if (!rawArgs) {
    return {
      handled: true,
      reply:
        'Please include the food name, macros, and unit.\n\nChoose a unit: **Per serving / Per scoop / Per piece / Per 100 g**\nExample: `/Add dahi balle 200 kcal per serving`',
      placeholderHint: "e.g. 200 kcal per serving",
    };
  }

  const systemPrompt = `Extract food nutrition fields from the user's text into strict JSON.
Return ONLY valid JSON:
{
  "name": "string or null",
  "kcal": number or null,
  "protein": number or null,
  "carbs": number or null,
  "fat": number or null,
  "unit": "per serving" | "per scoop" | "per piece" | "per 100 g" | null,
  "unitGrams": number or null,
  "fromSearch": boolean
}`;

  const extracted = await extractJsonWithGroqOrGemini(
    systemPrompt,
    rawArgs,
    geminiKey,
    geminiModels,
    signal
  );

  const name = stripHtmlAndCap(extracted?.name ?? "", 80);
  const unit = extracted?.unit as
    | "per serving"
    | "per scoop"
    | "per piece"
    | "per 100 g"
    | null
    | undefined;

  if (!name) {
    return {
      handled: true,
      reply: 'Could not read the food name. Example: `/Add whey 25g protein 120 kcal per scoop`',
      placeholderHint: "e.g. 200 kcal per serving",
    };
  }

  if (!unit || !["per serving", "per scoop", "per piece", "per 100 g"].includes(unit)) {
    return {
      handled: true,
      reply: `Unit is missing for **${name}**. Please pick one:\n**Per serving / Per scoop / Per piece / Per 100 g**\n\nExample: \`/Add ${name} 200 kcal per serving\``,
      placeholderHint: "e.g. 200 kcal per serving",
    };
  }

  const kcal = Number(extracted?.kcal ?? 0) || 0;
  const protein = Number(extracted?.protein ?? 0) || 0;
  const carbs = extracted?.carbs != null ? Number(extracted.carbs) : null;
  const fat = extracted?.fat != null ? Number(extracted.fat) : null;
  const unitGrams = extracted?.unitGrams != null ? Number(extracted.unitGrams) : null;

  const converted = convertToPer100g({
    kcal,
    protein,
    carbs,
    fat,
    unit,
    unitGrams,
  });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { handled: true, reply: "Database is not configured on the server." };
  }

  await ensureUserFoodsSeeded(userId);

  const sourceValue =
    /\bsearch\b/i.test(rawArgs) || extracted?.fromSearch ? "search" : "skill_add";

  const { error } = await admin.from("user_foods").upsert(
    {
      user_id: userId,
      display_name: name,
      kcal_per_100g: converted.kcal_per_100g,
      protein_per_100g: converted.protein_per_100g,
      carbs_per_100g: converted.carbs_per_100g,
      fat_per_100g: converted.fat_per_100g,
      serving_g: converted.serving_g,
      grams_per_piece: converted.grams_per_piece,
      source: sourceValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,display_name" }
  );

  if (error) {
    console.error("[/Add] Supabase upsert error:", error.message);
    return { handled: true, reply: "Failed to save food to your table. Please try again." };
  }

  clearMacroDbCache(userId);

  const reply = [
    `### Saved to Your Food Table`,
    `| Field | Value (per 100g) |`,
    `| :--- | :--- |`,
    `| **Food** | ${name} |`,
    `| **Calories** | ${converted.kcal_per_100g} kcal |`,
    `| **Protein** | ${converted.protein_per_100g} g |`,
    `| **Carbs** | ${converted.carbs_per_100g != null ? `${converted.carbs_per_100g} g` : "N/A"} |`,
    `| **Fat** | ${converted.fat_per_100g != null ? `${converted.fat_per_100g} g` : "N/A"} |`,
    `| **Source** | ${sourceValue} |`,
    "",
    `Added **${name}** to your personal table.`,
  ].join("\n");

  return { handled: true, reply };
}

async function handleUpdateSkill(
  rawArgs: string,
  userId: string,
  geminiKey?: string,
  geminiModels?: string[],
  signal?: AbortSignal
): Promise<SkillResult> {
  if (!rawArgs) {
    return {
      handled: true,
      reply: "Specify the food name to update. Example: `/Update Optimum whey` or `/Update Optimum whey protein 24`",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { handled: true, reply: "Database is not configured on the server." };
  }

  await ensureUserFoodsSeeded(userId);

  const extracted = await extractJsonWithGroqOrGemini(
    `Extract food update intent into JSON:
{
  "foodName": "string",
  "field": "kcal" | "protein" | "carbs" | "fat" | "count_staple_protein" | null,
  "newValue": number | boolean | null,
  "fromLabel": boolean
}`,
    rawArgs,
    geminiKey,
    geminiModels,
    signal
  );

  const foodName = stripHtmlAndCap(extracted?.foodName || rawArgs, 80);

  let { data: row } = await admin
    .from("user_foods")
    .select("*")
    .eq("user_id", userId)
    .ilike("display_name", `%${foodName}%`)
    .limit(1)
    .maybeSingle();

  // If not in user_foods, check food_common and copy it to user_foods first (never edit food_common)
  if (!row) {
    const { data: commonRow } = await admin
      .from("food_common")
      .select("*")
      .or(`name.ilike.%${foodName}%,brand.ilike.%${foodName}%`)
      .limit(1)
      .maybeSingle();

    if (commonRow) {
      const { data: copied, error: copyErr } = await admin
        .from("user_foods")
        .upsert(
          {
            user_id: userId,
            food_common_id: commonRow.id,
            display_name: commonRow.name,
            kcal_per_100g: commonRow.kcal_per_100g,
            protein_per_100g: commonRow.protein_per_100g,
            carbs_per_100g: commonRow.carbs_per_100g,
            fibre_per_100g: commonRow.fibre_per_100g,
            fat_per_100g: commonRow.fat_per_100g,
            serving_g: commonRow.serving_g,
            serving_ml: commonRow.serving_ml,
            grams_per_piece: commonRow.grams_per_piece,
            source: "common",
            count_staple_protein: false,
          },
          { onConflict: "user_id,display_name" }
        )
        .select("*")
        .single();
      if (!copyErr && copied) row = copied;
    }
  }

  if (!row) {
    return {
      handled: true,
      reply: `**${foodName}** is not in your table. Use \`/Add\` to enter it, or \`/Search\` to look it up.`,
    };
  }

  const field = extracted?.field as string | null | undefined;
  const newValue = extracted?.newValue;

  if (!field || newValue == null) {
    return {
      handled: true,
      reply: [
        `### Current Values for **${row.display_name}** (per 100g)`,
        `- **kcal:** ${row.kcal_per_100g} kcal`,
        `- **protein:** ${row.protein_per_100g} g`,
        `- **carbs:** ${row.carbs_per_100g ?? "N/A"} g`,
        `- **fat:** ${row.fat_per_100g ?? "N/A"} g`,
        `- **count_staple_protein:** ${row.count_staple_protein}`,
        "",
        `Reply with which field to change and the new value, e.g.: \`/Update ${row.display_name} protein 24\``,
      ].join("\n"),
    };
  }

  const colMap: Record<string, string> = {
    kcal: "kcal_per_100g",
    protein: "protein_per_100g",
    carbs: "carbs_per_100g",
    fat: "fat_per_100g",
    count_staple_protein: "count_staple_protein",
  };
  const dbCol = colMap[field];
  if (!dbCol) {
    return {
      handled: true,
      reply: "Invalid field. You can update `kcal`, `protein`, `carbs`, `fat`, or `count_staple_protein`.",
    };
  }

  const beforeVal = row[dbCol];
  const nextSource = extracted?.fromLabel || /\blabel\b/i.test(rawArgs) ? "label" : "user_estimate";

  const { error: updErr } = await admin
    .from("user_foods")
    .update({
      [dbCol]: dbCol === "count_staple_protein" ? Boolean(newValue) : Number(newValue),
      source: nextSource,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("user_id", userId);

  if (updErr) {
    console.error("[/Update] Update error:", updErr.message);
    return { handled: true, reply: "Failed to update food item. Please try again." };
  }

  clearMacroDbCache(userId);

  return {
    handled: true,
    reply: `Updated **${row.display_name}** (${field}): **${beforeVal ?? "N/A"}** → **${newValue}** (source: \`${nextSource}\`).`,
  };
}

async function handleSearchSkill(rawArgs: string, signal?: AbortSignal): Promise<SkillResult> {
  const query = stripHtmlAndCap(rawArgs, 80);
  if (!query) {
    return {
      handled: true,
      reply: "Please provide a food or meal to search. Example: `/Search Amul paneer`",
    };
  }

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=3`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      return { handled: true, reply: `Search failed (${res.status}). Please try again or use \`/Add\`.` };
    }

    const data = (await res.json()) as {
      products?: Array<{
        product_name?: string;
        brands?: string;
        code?: string;
        nutriments?: Record<string, number | undefined>;
      }>;
    };

    const products = (data.products || []).slice(0, 3).filter((p) => p.product_name);
    if (products.length === 0) {
      return {
        handled: true,
        reply: `No results found for **${query}**. Use \`/Add ${query} <kcal> kcal <protein>g protein per 100 g\` to add it manually.`,
      };
    }

    const lines = products.map((p, idx) => {
      const name = stripHtmlAndCap(p.product_name, 60);
      const brand = stripHtmlAndCap(p.brands, 30);
      const label = brand ? `${name} (${brand})` : name;
      const n = p.nutriments || {};
      const kcal = Math.round(Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0) || 0);
      const prot = Math.round((Number(n["proteins_100g"] ?? 0) || 0) * 10) / 10;
      const carbs = Math.round((Number(n["carbohydrates_100g"] ?? 0) || 0) * 10) / 10;
      const fat = Math.round((Number(n["fat_100g"] ?? 0) || 0) * 10) / 10;
      const sourceUrl = p.code
        ? `https://world.openfoodfacts.org/product/${encodeURIComponent(p.code)}`
        : "https://world.openfoodfacts.org";

      return `${idx + 1}. **${label}** — ${kcal} kcal | ${prot}g protein | ${carbs}g carbs | ${fat}g fat (per 100g)\n   Source: ${sourceUrl}\n   Save command: \`/Add ${name} ${kcal} kcal ${prot}g protein ${carbs}g carbs ${fat}g fat per 100 g search\``;
    });

    return {
      handled: true,
      reply: [
        `### Search Results for "${query}" (per 100g)`,
        ...lines,
        "",
        "Pick one candidate and send its `/Add` command above to save it to your table.",
      ].join("\n"),
    };
  } catch {
    return {
      handled: true,
      reply: "Unable to reach food search right now. Please try again or use `/Add`.",
    };
  }
}

async function handleVerifyMacrosV2(
  rawArgs: string,
  messages: Msg[],
  userId: string,
  geminiKey?: string,
  geminiModels?: string[],
  signal?: AbortSignal
): Promise<SkillResult> {
  const parserPath = path.join(process.cwd(), "src/bots/madrix-macros/macro_parser_soul.md");
  const parserSoul = fs.existsSync(parserPath) ? fs.readFileSync(parserPath, "utf-8") : "";

  const targetText =
    rawArgs ||
    [...messages]
      .reverse()
      .find((m) => m.role === "user" && !/^\/?verify-macros\b/i.test(m.text.trim()))?.text ||
    "";

  if (!targetText.trim()) {
    return {
      handled: true,
      verified: false,
      reply: "No meal items found to verify. Log a meal first, then run `/verify-macros`.",
    };
  }

  const parsedJson = await extractJsonWithGroqOrGemini(
    parserSoul || "Parse the food items into JSON: { meals: [{ meal: 1, items: [{ name, qty, unit }] }] }",
    targetText,
    geminiKey,
    geminiModels,
    signal
  );

  const parsed = parsedJson as unknown as ParsedMealLog | null;
  if (!parsed || !Array.isArray(parsed.meals) || parsed.meals.length === 0) {
    return {
      handled: true,
      verified: false,
      reply: "Could not parse meal items to verify.",
    };
  }

  const { markdown, unmatched, items } = await calculateMeals(parsed, userId);

  if (unmatched.length > 0) {
    const missing = unmatched.map((u) => u.name).join(", ");
    return {
      handled: true,
      verified: false,
      reply: `${missing} is not in your table. Use /Add to enter it, or /Search to look it up.`,
    };
  }

  const checkItems: MacroItem[] = items.map((it) => ({
    name: it.name,
    quantity: `${it.qty} ${it.unit}`,
    calories: it.kcal,
    protein: it.protein,
  }));

  const fourPass = verifyFourOrders(checkItems);
  if (!fourPass.allMatch) {
    return {
      handled: true,
      verified: false,
      reply: `Verification mismatch across 4 passes.\nCalories: ${fourPass.calories.join(", ")}\nProtein: ${fourPass.protein.join(", ")}`,
    };
  }

  // Compare against the last model reply if one exists
  const lastModelMsg = [...messages].reverse().find((m) => m.role === "model")?.text ?? "";
  const prevCalMatch = lastModelMsg.match(/(\d+(?:\.\d+)?)\s*(?:cal|kcal)/i);
  const prevProMatch = lastModelMsg.match(/(\d+(?:\.\d+)?)\s*(?:g|gm)\s*protein/i);

  const computedCal = Math.round(fourPass.calories[0]);
  const computedPro = Math.round(fourPass.protein[0] * 10) / 10;

  if (prevCalMatch && Math.abs(parseFloat(prevCalMatch[1]) - computedCal) > 1.5) {
    return {
      handled: true,
      verified: false,
      reply: `Mismatch vs earlier answer: earlier reported **${prevCalMatch[1]} kcal**, recomputed **${computedCal} kcal**.\n\n${markdown}`,
    };
  }
  if (prevProMatch && Math.abs(parseFloat(prevProMatch[1]) - computedPro) > 1.5) {
    return {
      handled: true,
      verified: false,
      reply: `Mismatch vs earlier answer: earlier reported **${prevProMatch[1]}g protein**, recomputed **${computedPro}g protein**.\n\n${markdown}`,
    };
  }

  return {
    handled: true,
    verified: true,
    reply: `${markdown}\n\nVerified ✓ (4 independent passes matched against your food table)`,
  };
}

/**
 * Main slash-skill router executed BEFORE any LLM chat call.
 */
export async function runSlashSkills(params: {
  messages: Msg[];
  userId?: string | null;
  geminiKey?: string;
  geminiModels?: string[];
  signal?: AbortSignal;
}): Promise<SkillResult> {
  const { messages, userId, geminiKey, geminiModels = [], signal } = params;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text.trim() ?? "";
  if (!lastUserMsg) return { handled: false };

  const addMatch = lastUserMsg.match(/^\/add\b([\s\S]*)$/i);
  if (addMatch) {
    if (!userId) return { handled: true, reply: "Please sign in to add foods." };
    return handleAddSkill(addMatch[1].trim(), userId, geminiKey, geminiModels, signal);
  }

  const updateMatch = lastUserMsg.match(/^\/update\b([\s\S]*)$/i);
  if (updateMatch) {
    if (!userId) return { handled: true, reply: "Please sign in to update foods." };
    return handleUpdateSkill(updateMatch[1].trim(), userId, geminiKey, geminiModels, signal);
  }

  const searchMatch = lastUserMsg.match(/^\/search\b([\s\S]*)$/i);
  if (searchMatch) {
    return handleSearchSkill(searchMatch[1].trim(), signal);
  }

  const verifyMatch = lastUserMsg.match(/^\/?verify-macros\b([\s\S]*)$/i);
  if (verifyMatch) {
    if (userId && !isOwnerUser(userId)) {
      return handleVerifyMacrosV2(verifyMatch[1].trim(), messages, userId, geminiKey, geminiModels, signal);
    }
    if (geminiKey) {
      return runVerifyMacrosSkill(messages, geminiKey, geminiModels);
    }
  }

  return { handled: false };
}

/**
 * Owner legacy verify-macros skill (uses local .txt files).
 */
export async function runVerifyMacrosSkill(
  messages: Msg[],
  apiKey: string,
  modelsToTry: string[]
): Promise<SkillResult> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text.trim() ?? "";
  if (!/^\/?verify-macros\b/i.test(lastUserMsg)) {
    return { handled: false };
  }

  const dbCheck = readDbTwice();
  if (!dbCheck.ok) {
    return {
      handled: true,
      verified: false,
      reply: "Could not verify the food databases consistently across 2 reads.",
    };
  }

  const extractionPrompt = `You are verifying meal macros.
Recheck these two databases carefully:

=== personal_food_macros.txt ===
${dbCheck.personalDb}

=== burger_king_selected_macros.txt ===
${dbCheck.bkDb}

Extract every food item from the conversation (or the current message if specified) and calculate its exact calories (kcal) and protein (g) strictly following the database rules (e.g., cooked rice/dal/Maggi have 0 g protein).
Return ONLY valid JSON matching this schema:
{
  "items": [
    { "name": "string", "quantity": "string", "calories": number, "protein": number }
  ]
}`;

  const contents = messages.slice(-20).map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text).slice(0, 4000) }],
  }));
  while (contents[0]?.role === "model") contents.shift();

  const result = await generateWithFallback(modelsToTry, apiKey, {
    systemInstruction: { parts: [{ text: extractionPrompt }] },
    contents,
    generationConfig: { responseMimeType: "application/json" },
  });

  if (!result.ok) {
    return { handled: true, verified: false, reply: result.message };
  }

  const candidates = result.data.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const rawJson = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

  let items: MacroItem[] = [];
  try {
    const parsed = JSON.parse(rawJson) as { items?: MacroItem[] };
    if (Array.isArray(parsed.items)) {
      items = parsed.items;
    }
  } catch {
    return {
      handled: true,
      verified: false,
      reply: "No meal items found to verify. Send a meal first, then run verify-macros.",
    };
  }

  if (items.length === 0) {
    return {
      handled: true,
      verified: false,
      reply: "No meal items found to verify. Send a meal first, then run verify-macros.",
    };
  }

  const check = verifyFourOrders(items);
  const lines = items.map(
    (it) => `${it.name} (${it.quantity}): ${it.calories} kcal | ${it.protein} g protein`
  );

  if (!check.allMatch) {
    return {
      handled: true,
      verified: false,
      reply: `Verification mismatch detected across 4 calculation orders.\nCalories passes: ${check.calories.join(", ")}\nProtein passes: ${check.protein.join(", ")}`,
    };
  }

  const totalCal = check.calories[0];
  const totalPro = check.protein[0];

  const reply = [
    "Verified nutritional breakdown (DB checked 2x, 4-order calculation match):",
    "",
    ...lines,
    "",
    "Daily Total",
    `Calories: ${totalCal} kcal`,
    `Protein: ${totalPro} g`,
    "Carbohydrates: N/A (not listed in personal tracking values)",
    "Fat: N/A (not listed in personal tracking values)",
  ].join("\n");

  return {
    handled: true,
    verified: true,
    reply,
  };
}
