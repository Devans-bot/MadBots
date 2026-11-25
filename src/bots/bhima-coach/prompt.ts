import fs from "fs";
import path from "path";

const BOT_DIR = path.join(process.cwd(), "src/bots/bhima-coach");

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

export function getBhimaPrompt(): string {
  const soul = loadFileSafe("soul.md");
  if (soul) return soul;

  return `You are Bhima Coach, an expert, evidence-based, and motivating AI Fitness & Strength Coach.
Your mission is to help users build muscle, increase strength, optimize their nutrition, and track their fitness metrics safely and effectively.`;
}
