import React, { useState } from 'react';
import { Check, Copy, GitBranch } from 'lucide-react';
import type { CodeBlockPayload } from '../types';

interface CodeBlockCardProps {
  codeBlock: CodeBlockPayload;
  onRequestDiff: (codeBlock: CodeBlockPayload) => void;
  onCopied?: () => void;
}

const BLUE_KEYWORDS = new Set([
  '@group',
  '@binding',
  '@compute',
  '@workgroup_size',
  '@builtin',
  'var',
  'fn',
  'let',
  'if',
  'return',
  'export',
  'function',
  'const',
]);

const PINK_TYPES = new Set([
  'storage',
  'array',
  'vec3u',
  'vec3f',
  'vec3i',
  'u32',
  'f32',
  'Particle',
  'GPUDevice',
  'GPUTextureFormat',
  'GPUShaderModule',
]);

const BOLD_IDENTIFIERS = new Set(['main', 'arrayLength', 'cellCoord', 'cellHash']);

function highlightLine(line: string, lineIdx: number): React.ReactNode {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//')) {
    return (
      <span className="text-[#727687] dark:text-zinc-400">{line}</span>
    );
  }

  // Split preserving punctuation & whitespace
  const tokens = line.split(/(@[A-Za-z_][A-Za-z0-9_]*|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (BLUE_KEYWORDS.has(token)) {
      return (
        <span
          key={`${lineIdx}-${idx}`}
          className="text-[#0066ff] dark:text-[#66a3ff] font-semibold"
        >
          {token}
        </span>
      );
    }
    if (PINK_TYPES.has(token)) {
      return (
        <span
          key={`${lineIdx}-${idx}`}
          className="text-[#e40a65] dark:text-[#ff5ca1]"
        >
          {token}
        </span>
      );
    }
    if (BOLD_IDENTIFIERS.has(token)) {
      return (
        <span
          key={`${lineIdx}-${idx}`}
          className="font-bold text-[#1a1c1c] dark:text-white"
        >
          {token}
        </span>
      );
    }
    return <React.Fragment key={`${lineIdx}-${idx}`}>{token}</React.Fragment>;
  });
}

export function CodeBlockCard({
  codeBlock,
  onRequestDiff,
  onCopied,
}: CodeBlockCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeBlock.code);
      }
    } catch {
      // Fallback gracefully when clipboard permissions are restricted
    }
    setCopied(true);
    onCopied?.();
    window.setTimeout(() => setCopied(false), 1800);
  };

  const lines = codeBlock.code.split('\n');

  return (
    <div className="bg-white dark:bg-[#14171c] border border-[#e2e4ea] dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      {/* Window bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#f3f4f3] dark:bg-[#1c2028] border-b border-[#e8e8e7] dark:border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]/40 shrink-0"
          />
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24]/40 shrink-0"
          />
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]/40 shrink-0"
          />
          <span className="font-mono text-[11.5px] text-[#424656] dark:text-zinc-300 font-medium ml-2 truncate">
            {codeBlock.filename}
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white dark:bg-[#232832] text-[#727687] dark:text-zinc-300 border border-[#e2e2e2] dark:border-zinc-700 font-mono shrink-0">
          {codeBlock.language}
        </span>
      </div>

      {/* Syntax-highlighted Code viewport */}
      <pre className="font-mono text-[12px] leading-[1.65] text-[#1a1c1c] dark:text-zinc-100 p-3.5 overflow-x-auto bg-white dark:bg-[#14171c]">
        <code>
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {highlightLine(line, i)}
              {i < lines.length - 1 ? '\n' : null}
            </React.Fragment>
          ))}
        </code>
      </pre>

      {/* Actions */}
      <div className="flex items-center gap-2 p-2.5 bg-[#f9f9f8] dark:bg-[#191d24] border-t border-[#e8e8e7] dark:border-zinc-800">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${codeBlock.filename}`}
          className="flex-1 min-h-[38px] py-1.5 px-3 rounded-lg bg-white dark:bg-[#232832] hover:bg-[#f3f4f3] dark:hover:bg-[#2b313d] border border-[#e2e4ea] dark:border-zinc-700 text-[#1a1c1c] dark:text-zinc-100 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#727687] dark:text-zinc-400" />
          )}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>

        <button
          type="button"
          onClick={() => onRequestDiff(codeBlock)}
          aria-label={
            codeBlock.diffApplied
              ? `View applied diff for ${codeBlock.filename}`
              : `Apply diff for ${codeBlock.filename}`
          }
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
            codeBlock.diffApplied
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[#0066ff] hover:bg-[#0050cb] text-white'
          }`}
        >
          {codeBlock.diffApplied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <GitBranch className="w-3.5 h-3.5" />
          )}
          <span>{codeBlock.diffApplied ? 'Diff Applied' : 'Apply Diff'}</span>
        </button>
      </div>
    </div>
  );
}
