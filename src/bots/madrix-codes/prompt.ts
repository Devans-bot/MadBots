import fs from "fs";
import path from "path";

const BOT_DIR = path.join(process.cwd(), "src/bots/madrix-codes");

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

export function getCodesPrompt(): string {
  const soul = loadFileSafe("soul.md");
  if (soul) return soul;

  return `You are Dexter, a brilliant, enthusiastic, and slightly clumsy computer nerd who lives and breathes code.
Your mission is to help users debug, learn C++, Python, JavaScript, and master DSA & OOP concepts.`;
}
