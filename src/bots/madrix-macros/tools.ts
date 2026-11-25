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
          "Updates or adds a food item in personal_food_macros.txt with its nutritional values.",
        parameters: {
          type: "OBJECT",
          properties: {
            foodName: {
              type: "STRING",
              description: "Name of the food item (e.g. 'Roasted chana' or 'Aloo sabji')",
            },
            basis: {
              type: "STRING",
              description: "Measurement basis (e.g. '100 g', '100 ml', '1 egg')",
            },
            calories: {
              type: "NUMBER",
              description: "Calories in kcal",
            },
            protein: {
              type: "NUMBER",
              description: "Protein in grams",
            },
            notes: {
              type: "STRING",
              description: "Optional notes",
            },
            summary: {
              type: "STRING",
              description: "Brief summary of the addition or update",
            },
          },
          required: ["foodName", "basis", "calories", "protein"],
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

  try {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, error: "Database file not found" };
    }

    const currentContent = fs.readFileSync(DB_PATH, "utf-8");
    fs.copyFileSync(DB_PATH, BAK_PATH);

    const foodName = String(args.foodName ?? "").trim();
    const basis = String(args.basis ?? "100 g").trim();
    const calories = Number(args.calories) || 0;
    const protein = Number(args.protein) || 0;
    const notes = String(args.notes ?? "").trim();
    const summary = String(
      args.summary ??
        (foodName
          ? `Added ${foodName} (${basis}: ${calories} kcal, ${protein} g protein)`
          : "Updated personal food database")
    );

    // If structured foodName is provided, safely insert/update row without rewriting entire file
    if (foodName) {
      const lines = currentContent.split("\n");
      const nameRegex = new RegExp(`^${foodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

      const paddedName = foodName.padEnd(27);
      const paddedBasis = basis.padEnd(12);
      const paddedCals = String(calories).padEnd(17);
      const paddedPro = String(protein).padEnd(14);
      const newRow = `${paddedName}${paddedBasis}${paddedCals}${paddedPro}${notes}`.trimEnd();

      let replaced = false;
      for (let i = 0; i < lines.length; i++) {
        if (nameRegex.test(lines[i])) {
          lines[i] = newRow;
          replaced = true;
          break;
        }
      }

      if (!replaced) {
        // Insert right before 'ADDITIONAL SERVING REFERENCES' or at the end of PERSONAL MACRO TABLE
        const insertIdx = lines.findIndex((l) => l.includes("ADDITIONAL SERVING REFERENCES"));
        if (insertIdx !== -1) {
          lines.splice(insertIdx - 1, 0, newRow);
        } else {
          lines.push(newRow);
        }
      }

      fs.writeFileSync(DB_PATH, lines.join("\n"), "utf-8");
      return { success: true, summary };
    }

    // Fallback: If updatedContent was provided, ensure it contains the full database before writing
    const updatedContent = String(args.updatedContent ?? "");
    if (
      updatedContent.length > 500 &&
      updatedContent.includes("PERSONAL MACRO TABLE") &&
      updatedContent.includes("IMPORTANT TRACKING RULES")
    ) {
      fs.writeFileSync(DB_PATH, updatedContent, "utf-8");
      return { success: true, summary };
    }

    return {
      success: false,
      error: "Invalid or truncated database update payload. Preserved existing database.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update database file",
    };
  }
}
