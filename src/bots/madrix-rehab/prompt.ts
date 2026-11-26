import fs from "fs";
import path from "path";

const SOUL_PATH = path.join(process.cwd(), "src/bots/madrix-rehab/soul.md");

export function getRehabPrompt(): string {
  try {
    if (fs.existsSync(SOUL_PATH)) {
      return fs.readFileSync(SOUL_PATH, "utf-8");
    }
  } catch {
    // ignore read error
  }
  return "You are Rehab-Rishi, a calm, evidence-based sports physiotherapist and strength rehab coach.";
}
