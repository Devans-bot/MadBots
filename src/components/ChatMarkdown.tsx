"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

export function ChatMarkdown({
  content,
  accentColor = "#0066ff",
}: {
  content: string;
  accentColor?: string;
}) {
  return (
    <div className="space-y-1.5 text-[14px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[16px] font-bold text-[var(--ui-text)] pt-1" style={{ fontFamily: "var(--font-rubik)" }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-bold text-[var(--ui-text)] pt-1" style={{ fontFamily: "var(--font-rubik)" }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14.5px] font-bold text-[var(--ui-text)] pt-0.5" style={{ fontFamily: "var(--font-rubik)" }}>{children}</h3>
          ),
          p: ({ children }) => <p className="leading-snug">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div
              className="overflow-x-auto rounded-lg bg-transparent my-2 border"
              style={{ borderColor: accentColor }}
            >
              <table
                className="w-full border-collapse text-left text-[12px] bg-transparent"
                style={{ fontFamily: "var(--font-nunito)" }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-black/5 dark:bg-white/5 font-semibold" style={{ fontFamily: "var(--font-rubik)" }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th
              className="border-b px-3 py-2 font-semibold whitespace-nowrap"
              style={{ borderColor: `${accentColor}66`, fontFamily: "var(--font-rubik)" }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="border-b px-3 py-2"
              style={{ borderColor: `${accentColor}33` }}
            >
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold italic text-black dark:text-zinc-100" style={{ fontFamily: "var(--font-rubik)" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="font-bold italic text-black dark:text-zinc-100" style={{ fontFamily: "var(--font-rubik)" }}>{children}</em>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return <code className={className}>{children}</code>;
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700 font-mono text-[12.5px]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            const child = React.Children.only(children) as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;
            const className = child?.props?.className || "";
            const codeText = String(child?.props?.children ?? "").replace(/\n$/, "");
            return <CodeBlock code={codeText} language={className} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
