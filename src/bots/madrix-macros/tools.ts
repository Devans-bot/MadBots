import fs from "fs";
import path from "path";
import { clearMacroDbCache } from "@/lib/calculateMacros";
import { getSupabaseAdmin } from "@/lib/supabase";

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

export async function handleMacrosToolCall(
  name: string,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  if (name !== "update_personal_food_db") {
    return { ok: false, success: false, message: `Unknown tool: ${name}`, error: `Unknown tool: ${name}` };
  }

  try {
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

    // 1. Primary Cloud Save: Upsert into Supabase food_macros (works on Vercel + local)
    let savedToSupabase = false;
    const supabase = getSupabaseAdmin();
    if (supabase && foodName) {
      const basisLower = basis.toLowerCase();
      let dbBasis = "100g";
      let servingSize = 100;
      if (basisLower.includes("ml")) {
        dbBasis = "100ml";
        const m = basisLower.match(/[\d.]+/);
        servingSize = m ? parseFloat(m[0]) : 100;
      } else if (
        basisLower.includes("egg") ||
        basisLower.includes("pkt") ||
        basisLower.includes("pack") ||
        basisLower.includes("count") ||
        basisLower.includes("serving") ||
        basisLower === "1"
      ) {
        dbBasis = "count";
        servingSize = 1;
      } else {
        const m = basisLower.match(/[\d.]+/);
        servingSize = m ? parseFloat(m[0]) : 100;
      }

      const { error } = await supabase.from("food_macros").upsert(
        {
          name: foodName,
          name_key: foodName.toLowerCase(),
          basis: dbBasis,
          serving_size: servingSize,
          kcal: calories,
          protein,
          source: "Personal DB",
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name_key" }
      );

      if (!error) {
        savedToSupabase = true;
        clearMacroDbCache();
      } else {
        console.error("[Tools] Supabase upsert error:", error.message);
      }
    }

    // 2. Local File Sync (best-effort; skipped gracefully on read-only Vercel filesystem)
    let currentContent = "";
    try {
      if (fs.existsSync(DB_PATH)) {
        currentContent = fs.readFileSync(DB_PATH, "utf-8");
      }
    } catch {
      // ignore local read failure if Supabase already saved
    }

    const writeSafely = (contentToWrite: string): Record<string, unknown> => {
      try {
        try {
          fs.copyFileSync(DB_PATH, BAK_PATH);
        } catch {
          // Ignore backup failure
        }
        fs.writeFileSync(DB_PATH, contentToWrite, "utf-8");
        clearMacroDbCache();
        return { ok: true, success: true, summary };
      } catch (writeErr) {
        const code = (writeErr as NodeJS.ErrnoException)?.code;
        if (savedToSupabase) {
          return { ok: true, success: true, summary };
        }
        if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
          console.warn(`[Tools] Filesystem is read-only (${code}); skipping write on hosted deployment.`);
          return {
            ok: false,
            success: false,
            message: "Saving food edits isn't available on the hosted version yet.",
            error: "Saving food edits isn't available on the hosted version yet.",
          };
        }
        const msg = writeErr instanceof Error ? writeErr.message : "Failed to write database file";
        console.error("[Tools] Write error on personal_food_macros.txt:", code || msg);
        return { ok: false, success: false, message: msg, error: msg };
      }
    };

    if (foodName) {
      if (!currentContent) {
        return savedToSupabase
          ? { ok: true, success: true, summary }
          : { ok: false, success: false, message: "Database file not found", error: "Database file not found" };
      }

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
        const insertIdx = lines.findIndex((l) => l.includes("ADDITIONAL SERVING REFERENCES"));
        if (insertIdx !== -1) {
          lines.splice(insertIdx - 1, 0, newRow);
        } else {
          lines.push(newRow);
        }
      }

      return writeSafely(lines.join("\n"));
    }

    const updatedContent = String(args.updatedContent ?? "");
    if (
      updatedContent.length > 500 &&
      updatedContent.includes("PERSONAL MACRO TABLE") &&
      updatedContent.includes("IMPORTANT TRACKING RULES")
    ) {
      return writeSafely(updatedContent);
    }

    return {
      ok: false,
      success: false,
      message: "Invalid or truncated database update payload. Preserved existing database.",
      error: "Invalid or truncated database update payload. Preserved existing database.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update database file";
    return {
      ok: false,
      success: false,
      message: msg,
      error: msg,
    };
  }
}
