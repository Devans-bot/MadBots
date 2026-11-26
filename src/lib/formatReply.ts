/**
 * Lightly normalizes AI replies while preserving valid Markdown
 * (headings, bold, tables, lists, and code blocks) for ReactMarkdown rendering.
 */
export function cleanReply(raw: string): string {
  const parts = raw.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        return part;
      }

      return part
        .replace(/\$\$?([^$\n]+)\$\$?/g, "$1")
        .replace(/\\mathcal\{([^}]*)\}/g, "$1")
        .replace(/\\text\{([^}]*)\}/g, "$1")
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1 / $2)")
        .replace(/\\log/g, "log")
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\ge/g, ">=")
        .replace(/\\le/g, "<=")
        .replace(/\n{3,}/g, "\n\n");
    })
    .join("")
    .trim();
}
