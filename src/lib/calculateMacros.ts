import fs from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";

export interface ParsedItem {
  name: string;
  qty: number;
  unit: "g" | "ml" | "count";
}

export interface ParsedMealLog {
  isNonMeal?: boolean;
  meals: { meal: number; items: ParsedItem[] }[];
}

export interface MacroEntry {
  id?: string;
  foodCommonId?: string | null;
  name: string;
  basis: "100g" | "100ml" | "serving" | "count";
  servingSize: number;
  gramsPerPiece?: number | null;
  kcal: number;
  protein: number;
  carbs?: number | null;
  fat?: number | null;
  countStapleProtein?: boolean;
  source: string;
}

export interface ComputedMealItem {
  meal: number;
  name: string;
  qty: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number | null;
  fat: number | null;
  note: string;
}

const ZERO_PROTEIN_KEYWORDS = ["cooked rice", "rice", "cooked dal", "dal", "maggi"];

const ALIASES: Record<string, string> = {
  milk: "whole milk",
  "cow milk": "whole milk",
  "full cream milk": "whole milk",
  egg: "whole egg",
  eggs: "whole egg",
  "whole eggs": "whole egg",
  "boiled egg": "whole egg",
  "boiled eggs": "whole egg",
  soya: "soya chunks (dry)",
  "soya chunk": "soya chunks (dry)",
  "soya chunks": "soya chunks (dry)",
  chicken: "chicken breast (raw)",
  "chicken breast": "chicken breast (raw)",
  rice: "cooked rice",
  dal: "cooked dal",
  goat: "goat meat (cooked)",
  mutton: "goat meat (cooked)",
  "aloo sabzi": "aloo sabji",
  chana: "roasted chana",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new Map<string, { db: Map<string, MacroEntry>; expiresAt: number }>();

export function isOwnerUser(userId?: string | null): boolean {
  const ownerId = process.env.OWNER_USER_ID?.trim();
  return Boolean(ownerId && userId && userId === ownerId);
}

export function clearMacroDbCache(userId?: string): void {
  if (userId) {
    userCache.delete(userId);
    return;
  }
  userCache.clear();
}

function parseNumber(val?: string): number | null {
  if (!val || val.toUpperCase() === "N/A") return null;
  const m = val.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function loadFromLocalFiles(): Map<string, MacroEntry> {
  const db = new Map<string, MacroEntry>();
  const botDir = path.join(process.cwd(), "src/bots/madrix-macros");

  try {
    const personalPath = path.join(botDir, "personal_food_macros.txt");
    if (fs.existsSync(personalPath)) {
      const lines = fs.readFileSync(personalPath, "utf-8").split("\n");
      let inTable = false;
      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("-------------------------")) {
          inTable = true;
          continue;
        }
        if (trimmed.startsWith("ADDITIONAL SERVING REFERENCES")) break;
        if (!inTable) continue;

        const cols = trimmed.split(/\s{2,}/);
        if (cols.length < 4) continue;

        const rawName = cols[0].trim();
        const basisText = cols[1].trim().toLowerCase();
        const kcal = parseNumber(cols[2]) ?? 0;
        const protein = parseNumber(cols[3]) ?? 0;

        let basis: MacroEntry["basis"] = "100g";
        let servingSize = 100;
        if (basisText.includes("ml")) {
          basis = "100ml";
          servingSize = parseNumber(basisText) ?? 100;
        } else if (
          basisText.includes("egg") ||
          basisText.includes("pkt") ||
          basisText.includes("pack") ||
          basisText.includes("count")
        ) {
          basis = "count";
          servingSize = 1;
        } else {
          basis = "100g";
          servingSize = parseNumber(basisText) ?? 100;
        }

        db.set(rawName.toLowerCase(), {
          name: rawName,
          basis,
          servingSize,
          kcal,
          protein,
          countStapleProtein: false,
          source: "Personal DB",
        });
      }
    }
  } catch (err) {
    console.error("[calculateMacros] Error reading personal_food_macros.txt:", err);
  }

  try {
    const bkPath = path.join(botDir, "burger_king_selected_macros.txt");
    if (fs.existsSync(bkPath)) {
      const lines = fs.readFileSync(bkPath, "utf-8").split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("Item |") || !line.includes("|")) continue;

        const cols = line.split("|").map((s) => s.trim());
        if (cols.length < 9) continue;

        const rawName = cols[0];
        const key = rawName.toLowerCase();
        if (db.has(key)) continue;

        const kcal = parseNumber(cols[2]) ?? 0;
        const protein = parseNumber(cols[8]) ?? 0;

        db.set(key, {
          name: rawName,
          basis: "serving",
          servingSize: 1,
          kcal,
          protein,
          countStapleProtein: false,
          source: "BK India DB",
        });
      }
    }
  } catch (err) {
    console.error("[calculateMacros] Error reading burger_king_selected_macros.txt:", err);
  }

  return db;
}

export async function ensureUserFoodsSeeded(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { count, error } = await admin
    .from("user_foods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[calculateMacros] Failed to check user_foods count:", error.message);
    return;
  }

  if ((count ?? 0) === 0) {
    const { error: rpcErr } = await admin.rpc("copy_common_foods_for_user", { uid: userId });
    if (rpcErr) {
      console.error("[calculateMacros] copy_common_foods_for_user failed:", rpcErr.message);
    }
  }
}

export async function loadUserFoodsDb(userId: string): Promise<Map<string, MacroEntry>> {
  const cached = userCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.db;
  }

  const db = new Map<string, MacroEntry>();
  const admin = getSupabaseAdmin();
  if (!admin) return db;

  await ensureUserFoodsSeeded(userId);

  const { data, error } = await admin
    .from("user_foods")
    .select(
      "id, food_common_id, display_name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_g, serving_ml, grams_per_piece, source, count_staple_protein"
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[calculateMacros] Failed to load user_foods:", error.message);
    return db;
  }

  for (const row of data || []) {
    const name = String(row.display_name || "").trim();
    if (!name) continue;
    const basis: MacroEntry["basis"] = row.serving_ml
      ? "100ml"
      : row.grams_per_piece && !row.serving_g
        ? "count"
        : "100g";

    db.set(name.toLowerCase(), {
      id: String(row.id),
      foodCommonId: row.food_common_id ? String(row.food_common_id) : null,
      name,
      basis,
      servingSize: 100,
      gramsPerPiece: row.grams_per_piece != null ? Number(row.grams_per_piece) : row.serving_g != null ? Number(row.serving_g) : null,
      kcal: Number(row.kcal_per_100g) || 0,
      protein: Number(row.protein_per_100g) || 0,
      carbs: row.carbs_per_100g != null ? Number(row.carbs_per_100g) : null,
      fat: row.fat_per_100g != null ? Number(row.fat_per_100g) : null,
      countStapleProtein: Boolean(row.count_staple_protein),
      source: String(row.source || "user_foods"),
    });
  }

  userCache.set(userId, { db, expiresAt: Date.now() + CACHE_TTL_MS });
  return db;
}

export async function loadDatabases(userId?: string | null): Promise<Map<string, MacroEntry>> {
  // Regular signed-in users read ONLY from user_foods (never food_common or local .txt files)
  if (userId && !isOwnerUser(userId)) {
    return loadUserFoodsDb(userId);
  }

  const cacheKey = userId ? `owner:${userId}` : "owner:local";
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.db;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("food_macros")
        .select("name, name_key, basis, serving_size, kcal, protein, source");

      if (!error && Array.isArray(data) && data.length > 0) {
        const db = new Map<string, MacroEntry>();
        for (const row of data) {
          db.set(String(row.name_key).toLowerCase(), {
            name: String(row.name),
            basis: (row.basis as MacroEntry["basis"]) || "100g",
            servingSize: Number(row.serving_size) || 100,
            kcal: Number(row.kcal) || 0,
            protein: Number(row.protein) || 0,
            countStapleProtein: false,
            source: row.source === "BK India DB" ? "BK India DB" : "Personal DB",
          });
        }
        userCache.set(cacheKey, { db, expiresAt: Date.now() + CACHE_TTL_MS });
        return db;
      }
    } catch (err) {
      console.error("[calculateMacros] Supabase fetch failed, falling back to local files:", err);
    }
  }

  const localDb = loadFromLocalFiles();
  userCache.set(cacheKey, { db: localDb, expiresAt: Date.now() + CACHE_TTL_MS });
  return localDb;
}

export function findFoodMatch(db: Map<string, MacroEntry>, rawName: string): MacroEntry | undefined {
  const normalized = String(rawName || "").toLowerCase().trim();
  if (!normalized) return undefined;
  const lookupKey = ALIASES[normalized] ?? normalized;
  let entry = db.get(lookupKey) ?? db.get(normalized);

  if (!entry) {
    for (const [k, v] of db.entries()) {
      if (k === lookupKey || (lookupKey.length >= 4 && k.includes(lookupKey))) {
        entry = v;
        break;
      }
    }
  }

  return entry;
}

export function computeItemMacros(entry: MacroEntry, qty: number, unit: string) {
  let multiplier = 1;
  if (entry.basis === "100g" || entry.basis === "100ml") {
    if (unit === "count") {
      const pieceGrams =
        entry.gramsPerPiece ?? (entry.name.toLowerCase() === "roti" ? 40 : entry.servingSize || 100);
      multiplier = (qty * pieceGrams) / (entry.servingSize || 100);
    } else {
      multiplier = qty / (entry.servingSize || 100);
    }
  } else {
    multiplier = qty / (entry.servingSize || 1);
  }

  const kcal = entry.kcal * multiplier;
  const isZeroProtein =
    ZERO_PROTEIN_KEYWORDS.some((kw) => entry.name.toLowerCase().includes(kw)) &&
    !entry.countStapleProtein;
  const protein = isZeroProtein ? 0 : entry.protein * multiplier;
  const carbs = entry.carbs != null ? entry.carbs * multiplier : null;
  const fat = entry.fat != null ? entry.fat * multiplier : null;
  const note = isZeroProtein ? "Protein excluded per rule" : entry.source;

  return { kcal, protein, carbs, fat, note };
}

export async function calculateMeals(parsed: ParsedMealLog, userId?: string | null) {
  const db = await loadDatabases(userId);
  const rows: string[] = [];
  const unmatched: ParsedItem[] = [];
  const items: ComputedMealItem[] = [];
  const multiMeal = (parsed.meals?.length ?? 0) > 1;

  let totalKcal = 0;
  let totalProtein = 0;

  for (const group of parsed.meals || []) {
    for (const item of group.items || []) {
      const entry = findFoodMatch(db, item.name);

      if (!entry) {
        unmatched.push(item);
        continue;
      }

      const qty = Number(item.qty) || 1;
      const { kcal, protein, carbs, fat, note } = computeItemMacros(entry, qty, item.unit);

      totalKcal += kcal;
      totalProtein += protein;

      const kcalFormatted = Math.round(kcal);
      const proteinFormatted = Number.isInteger(Number(protein.toFixed(1)))
        ? String(Math.round(protein))
        : protein.toFixed(1);
      const displayName = multiMeal ? `Meal ${group.meal}: ${entry.name}` : entry.name;

      items.push({
        meal: group.meal,
        name: entry.name,
        qty,
        unit: item.unit,
        kcal: Math.round(kcal * 100) / 100,
        protein: Math.round(protein * 100) / 100,
        carbs: carbs != null ? Math.round(carbs * 100) / 100 : null,
        fat: fat != null ? Math.round(fat * 100) / 100 : null,
        note,
      });

      rows.push(
        `| ${displayName} | ${qty} ${item.unit} | ${kcalFormatted} kcal | ${proteinFormatted} g | ${note} |`
      );
    }
  }

  const finalKcal = Math.round(totalKcal);
  const finalProtein = Number.isInteger(Number(totalProtein.toFixed(1)))
    ? String(Math.round(totalProtein))
    : totalProtein.toFixed(1);

  const markdown = [
    "### Nutritional Breakdown",
    "| Food Item | Quantity | Calories | Protein | Notes |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...rows,
    "",
    "***Macros :***  ",
    `${finalKcal} cal,  `,
    `${finalProtein}gm protein`,
  ].join("\n");

  return { markdown, unmatched, items };
}
