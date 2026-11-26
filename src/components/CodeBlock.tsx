"use client";

import React, { useState } from "react";

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "elif", "for", "while", "do",
  "switch", "case", "break", "continue", "default", "class", "struct", "interface", "type",
  "enum", "import", "export", "from", "as", "async", "await", "try", "catch", "finally",
  "throw", "new", "this", "super", "extends", "implements", "public", "private", "protected",
  "static", "readonly", "def", "pass", "lambda", "with", "yield", "in", "is", "not", "and",
  "or", "void", "int", "long", "double", "float", "char", "bool", "boolean", "string",
  "number", "auto", "using", "namespace", "template", "typename", "virtual", "override",
  "constexpr", "sizeof", "include", "define", "pragma", "true", "false", "null", "undefined",
  "nullptr", "None", "True", "False", "self", "print", "console", "cout", "cin", "endl",
]);

const CONTROL_KEYWORDS = new Set([
  "return", "if", "else", "elif", "for", "while", "do", "switch", "case", "break",
  "continue", "try", "catch", "finally", "throw", "import", "export", "from", "as",
  "async", "await", "yield", "include", "define", "pragma",
]);

const BUILTIN_TYPES = new Set([
  "vector", "string", "map", "unordered_map", "set", "unordered_set", "pair", "tuple",
  "queue", "stack", "deque", "priority_queue", "Array", "Object", "Promise", "Record",
  "Set", "Map", "Error", "Math", "JSON", "React", "std", "list", "dict", "str", "len", "range",
]);

type Token = { text: string; color?: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  // Matches comments, preprocessor directives, strings, numbers, identifiers/function calls, or punctuation
  const regex =
    /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b(?=\s*\()|\b[A-Za-z_][A-Za-z0-9_]*\b|[^\s\w]+|\s+)/gm;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index) });
    }
    const word = match[0];
    lastIndex = regex.lastIndex;

    if (word.startsWith("//") || (word.startsWith("#") && !word.startsWith("#include") && !word.startsWith("#define"))) {
      tokens.push({ text: word, color: "#6A9955" }); // Comment green
    } else if (word.startsWith("#include") || word.startsWith("#define") || word.startsWith("#pragma")) {
      tokens.push({ text: word, color: "#C586C0" }); // Preprocessor purple
    } else if (word.startsWith('"') || word.startsWith("'") || word.startsWith("`")) {
      tokens.push({ text: word, color: "#CE9178" }); // String orange
    } else if (/^\d/.test(word)) {
      tokens.push({ text: word, color: "#B5CEA8" }); // Number light green
    } else if (CONTROL_KEYWORDS.has(word)) {
      tokens.push({ text: word, color: "#C586C0" }); // Control flow pink-purple
    } else if (KEYWORDS.has(word)) {
      tokens.push({ text: word, color: "#569CD6" }); // Keyword blue
    } else if (BUILTIN_TYPES.has(word) || /^[A-Z][A-Za-z0-9_]*$/.test(word)) {
      tokens.push({ text: word, color: "#4EC9B0" }); // Type / Class teal
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(word) && line[lastIndex] === "(") {
      tokens.push({ text: word, color: "#DCDCAA" }); // Function call yellow
    } else if (/^[=+\-*/<>!&|?:]+$/.test(word)) {
      tokens.push({ text: word, color: "#D4D4D4" }); // Operators
    } else {
      tokens.push({ text: word, color: "#9CDCFE" }); // Variables light blue
    }
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), color: "#D4D4D4" });
  }
  return tokens;
}

export function CodeBlock({
  code,
  language = "CODE",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const langLabel = (language || "CODE").replace(/^language-/, "").toUpperCase();
  const lines = code.replace(/\n$/, "").split("\n");

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-700/80 shadow-md my-1.5 text-left">
      {/* Top Bar: Traffic dots + Copy on left, Language name on top right */}
      <div className="px-3 py-1.5 bg-[#252526] border-b border-zinc-700/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-1 px-2 py-0.5 rounded bg-zinc-700/60 hover:bg-zinc-600/80 text-zinc-200 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[12px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Language badge strictly on top right */}
        <span className="px-2 py-0.5 rounded bg-[#0066ff]/20 text-[#66a3ff] border border-[#0066ff]/30 font-mono text-[10px] font-bold tracking-wider uppercase">
          {langLabel}
        </span>
      </div>

      {/* VS Code Syntax Highlighted Body */}
      <pre className="p-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-[#d4d4d4] select-text">
        <code>
          {lines.map((line, lineIdx) => (
            <div key={lineIdx} className="min-h-[1.2em]">
              {tokenizeLine(line).map((tok, tokIdx) => (
                <span key={tokIdx} style={tok.color ? { color: tok.color } : undefined}>
                  {tok.text}
                </span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
