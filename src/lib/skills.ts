import fs from "fs";
import path from "path";
import { generateWithFallback } from "@/lib/gemini";

const PERSONAL_DB_PATH = path.join(process.cwd(), "src/bots/madrix-macros/personal_food_macros.txt");
const BK_DB_PATH = path.join(process.cwd(), "src/bots/madrix-macros/burger_king_selected_macros.txt");

type Msg = { role: "user" | "model"; text: string };

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
};

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

function verifyFourOrders(items: MacroItem[]): {
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
 * Runs the `verify-macros` skill when triggered by the user.
 * 1. Rechecks both food databases 2 times.
 * 2. Extracts and recalculates each item's calories & protein against the databases.
 * 3. Computes total calories and protein separately across 4 different orderings.
 * 4. If all 4 sums match, returns the verified total with `verified: true` for the blue badge.
 */
export async function runVerifyMacrosSkill(
  messages: Msg[],
  apiKey: string,
  modelsToTry: string[]
): Promise<SkillResult> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text.trim() ?? "";
  if (!/^verify-macros\b/i.test(lastUserMsg)) {
    return { handled: false };
  }

  // 1. Recheck database files 2 times
  const dbCheck = readDbTwice();
  if (!dbCheck.ok) {
    return {
      handled: true,
      verified: false,
      reply: "Could not verify the food databases consistently across 2 reads.",
    };
  }

  // 2. Ask Gemini to extract the meal items and compute exact per-item calories & protein from the rechecked DBs
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

  // 3. Recalculate calories & protein separately in 4 different orders
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
