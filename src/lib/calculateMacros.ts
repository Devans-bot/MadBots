import { getSupabaseAdmin } from "@/lib/supabase";

export interface ParsedItem {
  name: string;
  qty: number;
  unit: "g" | "ml" | "count";
}

export interface ParsedMealLog {
  isNonMeal?: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string;
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

export interface UnmatchedItemResult {
  item: ParsedItem;
  suggestion?: string;
}

const ZERO_PROTEIN_KEYWORDS = ["cooked rice", "rice", "cooked dal", "dal", "maggi"];

const ALIASES: Record<string, string> = {
  milk: "whole milk",
  "cow milk": "whole milk",
  "full cream milk": "whole milk",
  egg: "whole egg",
  eggs: "whole egg",
  "whole eggs": "whole egg",
  "eggs whole": "whole egg",
  "boiled egg": "whole egg",
  "boiled eggs": "whole egg",
  soya: "soya chunks (dry)",
  "soya chunk": "soya chunks (dry)",
  "soya chunks": "soya chunks (dry)",
  chicken: "chicken breast (raw)",
  "chicken breast": "chicken breast (raw)",
  rice: "cooked rice",
  "rice cooked": "cooked rice",
  dal: "cooked dal",
  "dal cooked": "cooked dal",
  goat: "goat meat (cooked)",
  mutton: "goat meat (cooked)",
  "aloo sabzi": "aloo sabji",
  chana: "roasted chana",
};

const KEEP_TRAILING_S = new Set(["oats", "fries", "chips", "nuggets", "chunks"]);

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

export function normalizeFoodTokens(raw: string): string[] {
  return String(raw || "")
    .toLowerCase()
    .replace(/[()[\]{},._/\\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      if (KEEP_TRAILING_S.has(tok)) return tok;
      if (tok.length > 3 && tok.endsWith("ies")) return tok.slice(0, -3) + "y";
      if (tok.length > 3 && tok.endsWith("es") && !tok.endsWith("ses")) return tok.slice(0, -1);
      if (tok.length > 3 && tok.endsWith("s") && !tok.endsWith("ss")) return tok.slice(0, -1);
      return tok;
    });
}

export function bagOfWordsKey(raw: string): string {
  return [...normalizeFoodTokens(raw)].sort().join(" ");
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) || 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      intersection++;
    }
  }
  return (2 * intersection) / (a.length - 1 + (b.length - 1));
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
      gramsPerPiece:
        row.grams_per_piece != null
          ? Number(row.grams_per_piece)
          : row.serving_g != null
            ? Number(row.serving_g)
            : null,
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

/**
 * Unified database loader: uses user_foods for ALL users including the owner.
 */
export async function loadDatabases(userId?: string | null): Promise<Map<string, MacroEntry>> {
  if (!userId) return new Map();
  return loadUserFoodsDb(userId);
}

/**
 * Matches a food name using:
 * 1. Exact key & alias match
 * 2. Word-order-independent & plural-stripped bag-of-words match (e.g. "rice cooked" -> "Cooked rice", "eggs whole" -> "Whole egg")
 * 3. Token-subset match when unambiguous
 * 4. Fuzzy similarity suggestion ("Did you mean X?") without false-matching
 */
export function findFoodMatchWithSuggestion(
  db: Map<string, MacroEntry>,
  rawName: string
): { entry?: MacroEntry; suggestion?: string } {
  const normalized = String(rawName || "").toLowerCase().trim();
  if (!normalized) return {};

  const queryBag = bagOfWordsKey(normalized);
  const aliasTarget = ALIASES[normalized] ?? ALIASES[queryBag];

  // 1. Direct & alias match
  const direct = db.get(normalized) ?? (aliasTarget ? db.get(aliasTarget) : undefined);
  if (direct) return { entry: direct };

  // 2. Bag-of-words match (ignores word order & plurals)
  const queryTokens = normalizeFoodTokens(normalized);
  for (const entry of db.values()) {
    const entryBag = bagOfWordsKey(entry.name);
    if (entryBag === queryBag) {
      return { entry };
    }
    if (aliasTarget && bagOfWordsKey(aliasTarget) === entryBag) {
      return { entry };
    }
  }

  // 3. All query tokens appear in entry tokens (only if query has >= 1 meaningful token and match is tight)
  const subsetMatches: MacroEntry[] = [];
  for (const entry of db.values()) {
    const entryTokens = normalizeFoodTokens(entry.name);
    if (
      queryTokens.length > 0 &&
      queryTokens.every((qt) => entryTokens.includes(qt)) &&
      entryTokens.length - queryTokens.length <= 1
    ) {
      subsetMatches.push(entry);
    }
  }
  if (subsetMatches.length === 1) {
    return { entry: subsetMatches[0] };
  }

  // 4. Fuzzy similarity for "Did you mean X?" suggestion (threshold 0.55)
  let bestScore = 0;
  let bestName: string | undefined;
  for (const entry of db.values()) {
    const entryBag = bagOfWordsKey(entry.name);
    const score = Math.max(
      diceSimilarity(normalized, entry.name.toLowerCase()),
      diceSimilarity(queryBag, entryBag)
    );
    if (score > bestScore) {
      bestScore = score;
      bestName = entry.name;
    }
  }

  if (bestScore >= 0.55 && bestName) {
    return { suggestion: bestName };
  }

  return {};
}

export function findFoodMatch(db: Map<string, MacroEntry>, rawName: string): MacroEntry | undefined {
  return findFoodMatchWithSuggestion(db, rawName).entry;
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

export async function calculateMeals(
  parsed: ParsedMealLog,
  userId?: string | null,
  options?: { includeBk?: boolean }
) {
  const rawDb = await loadDatabases(userId);
  const db = new Map<string, MacroEntry>();
  const includeBk = Boolean(options?.includeBk);

  for (const [k, v] of rawDb.entries()) {
    const isBk = /burger\s*king|bk\s*india|whopper/i.test(`${v.name} ${v.source}`);
    if (isBk && !includeBk) continue;
    db.set(k, v);
  }

  const rows: string[] = [];
  const unmatched: ParsedItem[] = [];
  const unmatchedDetails: UnmatchedItemResult[] = [];
  const items: ComputedMealItem[] = [];
  const multiMeal = (parsed.meals?.length ?? 0) > 1;

  let totalKcal = 0;
  let totalProtein = 0;

  for (const group of parsed.meals || []) {
    for (const item of group.items || []) {
      const { entry, suggestion } = findFoodMatchWithSuggestion(db, item.name);

      if (!entry) {
        unmatched.push(item);
        unmatchedDetails.push({ item, suggestion });
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

  // Never show totals if ANY item is unmatched or if nothing was matched
  if (unmatched.length > 0) {
    const parts: string[] = [];
    if (rows.length > 0) {
      parts.push(
        "### Matched Items (Partial — Total hidden until all items resolve)",
        "| Food Item | Quantity | Calories | Protein | Notes |",
        "| :--- | :--- | :--- | :--- | :--- |",
        ...rows,
        ""
      );
    }
    parts.push("### Unmatched Items");
    for (const u of unmatchedDetails) {
      if (u.suggestion) {
        parts.push(
          `- **${u.item.name}** is not in your table. Did you mean **${u.suggestion}**? Or use \`/Add\` to enter it, or \`/Search\` to look it up.`
        );
      } else {
        parts.push(
          `- **${u.item.name}** is not in your table. Use \`/Add\` to enter it, or \`/Search\` to look it up.`
        );
      }
    }

    return {
      markdown: parts.join("\n"),
      unmatched,
      unmatchedDetails,
      items,
      hasTotal: false,
    };
  }

  if (items.length === 0) {
    return {
      markdown: "",
      unmatched,
      unmatchedDetails,
      items,
      hasTotal: false,
    };
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

  return { markdown, unmatched, unmatchedDetails, items, hasTotal: true };
}
