import React from 'react';
import { Cpu, FileCode2, FileText, Layers, User } from 'lucide-react';
import { motion } from 'motion/react';
import type { BotAgent, ChatMessage, CodeBlockPayload } from '../types';
import { BotAvatar } from './BotAvatar';
import { CodeBlockCard } from './CodeBlockCard';

interface MessageBubbleProps {
  message: ChatMessage;
  bot: BotAgent;
  onRequestDiff: (messageId: string, codeBlock: CodeBlockPayload) => void;
  onCodeCopied: () => void;
}

function renderHighlightedSummary(
  summary: string,
  highlights?: { phrase: string; tone: 'blue' | 'pink' }[],
): React.ReactNode {
  if (!highlights || highlights.length === 0) return summary;

  let segments: (string | React.ReactNode)[] = [summary];

  highlights.forEach(({ phrase, tone }, hIdx) => {
    segments = segments.flatMap((seg, sIdx) => {
      if (typeof seg !== 'string') return [seg];
      const parts = seg.split(phrase);
      if (parts.length === 1) return [seg];
      const out: (string | React.ReactNode)[] = [];
      parts.forEach((part, pIdx) => {
        if (part) out.push(part);
        if (pIdx < parts.length - 1) {
          out.push(
            <span
              key={`hl-${hIdx}-${sIdx}-${pIdx}`}
              className={
                tone === 'blue'
                  ? 'font-bold text-[#0066ff] dark:text-[#66a3ff] underline decoration-[#0066ff]/50 decoration-2 underline-offset-2'
                  : 'font-bold text-[#e40a65] dark:text-[#ff5ca1]'
              }
            >
              {phrase}
            </span>,
          );
        }
      });
      return out;
    });
  });

  return segments;
}

interface DiscordBotFrameProps {
  bot: BotAgent;
  timestamp: string;
  children: React.ReactNode;
}

function DiscordBotFrame({ bot, timestamp, children }: DiscordBotFrameProps) {
  return (
    <motion.article
      data-testid="chat-box-bot"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-[95%] mx-auto rounded-lg px-0 py-2.5 text-left bg-[#ebf3ff] dark:bg-[#17243a] border border-[#d2e3ff] dark:border-[#243b61] text-[#1a1c1c] dark:text-zinc-100 shadow-[0_1px_4px_rgba(0,102,255,0.04)]"
    >
      <div className="flex flex-col items-stretch gap-1.5 text-left">
        {/* Compact left-aligned Discord author header */}
        <div className="flex items-center gap-1.5 flex-wrap leading-none">
          <BotAvatar bot={bot} size="xs" paletteTone="ink" />
          <span
            data-testid="bot-author-name"
            className="font-bold text-[7px] text-[#0b2a5b] dark:text-[#93c5fd] leading-none"
          >
            {bot.name}
          </span>
          <span className="px-1 py-0.5 rounded bg-[#0066ff] text-white text-[6px] font-bold tracking-wide uppercase leading-none">
            BOT
          </span>
          <span className="text-[7px] font-medium text-[#5c7499] dark:text-zinc-400 tabular-nums leading-none">
            Today at {timestamp}
          </span>
        </div>

        <div className="w-full min-w-0 space-y-2 text-left">{children}</div>
      </div>
    </motion.article>
  );
}

export function MessageBubble({
  message,
  bot,
  onRequestDiff,
  onCodeCopied,
}: MessageBubbleProps) {
  if (message.type === 'divider') {
    return (
      <div className="w-[95%] mx-auto flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-[#727687] dark:text-zinc-400 text-[10px] font-semibold tabular-nums shrink-0">
          {message.text}
        </span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <motion.article
        data-testid="chat-box-user"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-[95%] mx-auto rounded-lg px-0 py-2.5 text-left bg-[#f2f3f5] dark:bg-[#23262e] border border-[#e3e5e8] dark:border-zinc-700/80 text-[#1a1c1c] dark:text-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
      >
        <div className="flex flex-col items-stretch gap-1.5 text-left">
          {/* Compact left-aligned Discord author header */}
          <div className="flex items-center gap-1.5 leading-none">
            <div
              aria-hidden="true"
              className="w-4 h-4 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center shrink-0"
            >
              <User className="w-2.5 h-2.5" />
            </div>
            <span
              data-testid="user-author-name"
              className="font-bold text-[7px] text-zinc-950 dark:text-white leading-none"
            >
              You
            </span>
            <span className="text-[7px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums leading-none">
              Today at {message.timestamp}
            </span>
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {message.attachments.map((file) => (
                <span
                  key={file.id}
                  className="inline-flex items-center gap-1 text-[8px] font-mono text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded"
                >
                  {file.kind === 'code' ? (
                    <FileCode2 className="w-2.5 h-2.5 text-[#0066ff]" />
                  ) : file.kind === 'design' ? (
                    <Layers className="w-2.5 h-2.5 text-[#ff1493]" />
                  ) : (
                    <FileText className="w-2.5 h-2.5 text-zinc-500" />
                  )}
                  <span>{file.name}</span>
                </span>
              ))}
            </div>
          )}

          <p
            data-testid="user-chat-text"
            className="text-[9px] leading-relaxed text-left text-[#1a1c1c] dark:text-zinc-100"
          >
            {message.text}
          </p>
        </div>
      </motion.article>
    );
  }

  if (message.type === 'bot_code') {
    return (
      <DiscordBotFrame bot={bot} timestamp={message.timestamp}>
        <p
          data-testid="bot-chat-text"
          className="text-[9px] leading-relaxed text-left text-[#1a1c1c] dark:text-zinc-100"
        >
          {renderHighlightedSummary(message.summary, message.highlights)}
        </p>
        <CodeBlockCard
          codeBlock={message.codeBlock}
          onRequestDiff={(cb) => onRequestDiff(message.id, cb)}
          onCopied={onCodeCopied}
        />
      </DiscordBotFrame>
    );
  }

  if (message.type === 'bot_note') {
    return (
      <DiscordBotFrame bot={bot} timestamp={message.timestamp}>
        <p
          data-testid="bot-chat-text"
          className="text-[9px] leading-relaxed text-left text-[#1a1c1c] dark:text-zinc-100"
        >
          {message.text}
        </p>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/85 dark:bg-[#111927] border border-[#d2e3ff] dark:border-[#243b61] text-left">
          <Cpu className="w-3.5 h-3.5 text-[#0066ff] dark:text-[#66a3ff] shrink-0 mt-0.5" />
          <div className="text-[9px] leading-relaxed text-[#424656] dark:text-zinc-300">
            <span className="font-bold text-[#1a1c1c] dark:text-zinc-100">
              {message.noteTitle}{' '}
            </span>
            {message.noteDesc}
          </div>
        </div>
      </DiscordBotFrame>
    );
  }

  if (message.type === 'bot_bullets') {
    return (
      <DiscordBotFrame bot={bot} timestamp={message.timestamp}>
        <p
          data-testid="bot-chat-text"
          className="text-[9px] leading-relaxed text-left text-[#1a1c1c] dark:text-zinc-100"
        >
          {message.intro}
        </p>
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-white/85 dark:bg-[#111927] border border-[#d2e3ff] dark:border-[#243b61] text-[9px] leading-relaxed text-left text-[#424656] dark:text-zinc-300">
          {message.points.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span
                aria-hidden="true"
                className={
                  bot.accent === 'pink'
                    ? 'text-[#ff1493] font-bold'
                    : 'text-[#0066ff] dark:text-[#66a3ff] font-bold'
                }
              >
                •
              </span>
              <span>
                <strong className="text-[#1a1c1c] dark:text-zinc-100">
                  {pt.title}
                </strong>{' '}
                {pt.desc}
              </span>
            </div>
          ))}
        </div>
      </DiscordBotFrame>
    );
  }

  if (message.type === 'bot_gallery') {
    return (
      <DiscordBotFrame bot={bot} timestamp={message.timestamp}>
        <p
          data-testid="bot-chat-text"
          className="text-[9px] leading-relaxed text-left text-[#1a1c1c] dark:text-zinc-100"
        >
          {message.intro}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {message.previews.map((item) => (
            <div
              key={item.title}
              className="p-2.5 rounded-lg bg-white/90 dark:bg-[#111927] border border-[#d2e3ff] dark:border-[#243b61] flex flex-col gap-1.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-[#1a1c1c] dark:text-zinc-100 truncate">
                  {item.title}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                  {item.ratio}
                </span>
              </div>
              <div className="flex items-center gap-1 h-5 rounded-md overflow-hidden border border-zinc-200/80 dark:border-zinc-700">
                {item.palette.map((hex) => (
                  <span
                    key={hex}
                    title={hex}
                    className="flex-1 h-full"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <p className="text-[8.5px] text-[#424656] dark:text-zinc-400 leading-snug">
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </DiscordBotFrame>
    );
  }

  return null;
}
