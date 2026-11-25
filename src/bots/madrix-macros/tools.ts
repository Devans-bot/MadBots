import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/bots/madrix-macros/personal_food_macros.txt");
const BAK_PATH = path.join(process.cwd(), "src/bots/madrix-macros/personal_food_macros.txt.bak");

export const MACROS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "update_personal_food_db",
        description:
          "Updates or adds a food item in personal_food_macros.txt. Always preserve existing entries, tracking rules, and formatting.",
        parameters: {
          type: "OBJECT",
          properties: {
            updatedContent: {
              type: "STRING",
              description: "The complete updated text content for personal_food_macros.txt",
            },
            summary: {
              type: "STRING",
              description: "Brief summary of the food item added or updated",
            },
          },
          required: ["updatedContent", "summary"],
        },
      },
    ],
  },
];

export function handleMacrosToolCall(
  name: string,
  args: Record<string, unknown> = {}
): Record<string, unknown> {
  if (name !== "update_personal_food_db") {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  const updatedContent = String(args.updatedContent ?? "");
  const summary = String(args.summary ?? "Updated personal food database");

  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, BAK_PATH);
    }
    fs.writeFileSync(DB_PATH, updatedContent, "utf-8");
    return { success: true, summary };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to write file",
    };
  }
}
