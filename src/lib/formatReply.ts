/**
 * Sanitizes AI replies so raw markdown symbols (#, **, *, ---, `inline`, $$, \mathcal{})
 * never clutter plain-text chat bubbles, while preserving fenced code blocks intact.
 */
export function cleanReply(raw: string): string {
  const parts = raw.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part) => {
      // Preserve fenced code blocks untouched
      if (part.startsWith("```") && part.endsWith("```")) {
        return part;
      }

      return part
        // Remove markdown headings (#, ##, ###) at start of lines
        .replace(/^#{1,6}\s+/gm, "")
        // Remove horizontal rules (--- or ***)
        .replace(/^\s*[-*_]{3,}\s*$/gm, "")
        // Remove bold/italic markers (***text***, **text**, __text__, *text*)
        .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/\*([^*\n]+)\*/g, "$1")
        // Remove inline backticks (`code`)
        .replace(/`([^`\n]+)`/g, "$1")
        // Convert markdown bullet `* ` at start of line to `- `
        .replace(/^\s*\*\s+/gm, "- ")
        // Strip LaTeX block delimiters $$...$$ and inline $...$
        .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
        .replace(/\$([^$\n]+)\$/g, "$1")
        // Clean common LaTeX commands
        .replace(/\\mathcal\{([^}]*)\}/g, "$1")
        .replace(/\\text\{([^}]*)\}/g, "$1")
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1 / $2)")
        .replace(/\\log/g, "log")
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\ge/g, ">=")
        .replace(/\\le/g, "<=")
        // Collapse 3+ consecutive newlines to max 2
        .replace(/\n{3,}/g, "\n\n");
    })
    .join("")
    .trim();
}
