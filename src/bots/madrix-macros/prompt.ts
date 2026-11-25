import fs from "fs";
import path from "path";

const BOT_DIR = path.join(process.cwd(), "src/bots/madrix-macros");

function loadFileSafe(fileName: string): string {
  try {
    const filePath = path.join(BOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch {
    // ignore read error
  }
  return "";
}

const BK_TRIGGER = /\b(burger|whopper|bk|fries|shake|nuggets|makhani burst|paneer royale|crispy chicken|fiery chicken|saucy fries|fast food)\b/i;

export function getMacrosPrompt(contextText?: string): string {
  const soul = loadFileSafe("soul.md");
  const personalDb = loadFileSafe("personal_food_macros.txt");
  const shouldIncludeBk = Boolean(contextText && BK_TRIGGER.test(contextText));
  const bkDb = shouldIncludeBk ? loadFileSafe("burger_king_selected_macros.txt") : "";

  let full = soul;
  if (personalDb) {
    full += `\n\n---\n\n## REFERENCE DATABASE: personal_food_macros.txt\n\`\`\`\n${personalDb}\n\`\`\``;
  }
  if (bkDb) {
    full += `\n\n---\n\n## REFERENCE DATABASE: burger_king_selected_macros.txt\n\`\`\`\n${bkDb}\n\`\`\``;
  }
  return full;
}

/**
 * Lean, high-density system prompt generator for Groq API calls.
 * Uses the user's updated soul.md and personal food database directly.
 */
export function getCompactMacrosPrompt(contextText?: string): string {
  return getMacrosPrompt(contextText);
}
