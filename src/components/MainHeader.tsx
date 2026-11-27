"use client";
import Link from "next/link";
import type { Bot } from "@/lib/bots";

interface MainHeaderProps {
  isChatOpen?: boolean;
  activeBot?: Bot | null;
  onHomeClick?: () => void;
  onBotInfoClick?: () => void;
  onSettingsClick?: () => void;
}

export function MainHeader({
  isChatOpen = false,
  activeBot = null,
  onHomeClick,
  onBotInfoClick,
  onSettingsClick,
}: MainHeaderProps) {
  return (
    <header
      data-testid="main-header"
      className={`relative z-20 shrink-0 pt-safe bg-[var(--ui-card)] transition-colors duration-200 ${
        isChatOpen
          ? "rounded-b-none shadow-none border-b border-[var(--ui-border)]"
          : "rounded-b-[22px] madbots-header-shadow border-b border-[var(--ui-border)]"
      }`}
    >
      <div
        className={`px-4 w-full flex items-center justify-between transition-all duration-200 ${
          activeBot
            ? "pt-[5px] pb-[8px]"
            : isChatOpen
            ? "pt-3 pb-[15px] -translate-y-[5px]"
            : "pt-3 pb-[15px] translate-y-0"
        }`}
      >
        {activeBot ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (onHomeClick) onHomeClick();
              }}
              aria-label="Back to Agents"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ui-text)] hover:bg-zinc-500/10 transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onBotInfoClick) onBotInfoClick();
              }}
              aria-label={`Open ${activeBot.name} profile`}
              className="flex items-center gap-2.5 min-w-0 py-0.5 pr-1.5 rounded-xl hover:bg-zinc-500/10 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <div className="relative shrink-0">
                {activeBot.avatar ? (
                  <img
                    src={activeBot.avatar}
                    alt={activeBot.name}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-300 dark:border-zinc-600"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: activeBot.color }}
                  >
                    {activeBot.initial}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-[var(--ui-card)]" />
              </div>
              <span className="font-bold text-[16px] leading-none tracking-tight text-[var(--ui-text)] font-headline truncate flex items-center gap-0.5">
                <span className="truncate">{activeBot.name}</span>
                <span className="material-symbols-outlined text-[16px] text-[var(--ui-muted)]">chevron_right</span>
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onHomeClick) onHomeClick();
            }}
            aria-label="MaDbotS Home"
            className="h-9 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 rounded"
          >
            <img
              src="/icon-512.jpg"
              alt=""
              className="w-7 h-7 rounded-[7px] object-cover border border-zinc-300 dark:border-zinc-600 shrink-0 shadow-xs"
            />
            <span className="font-black text-[19px] leading-none tracking-tighter text-[#22439E] dark:text-[#5b82e8] font-headline">
              MaDbotS<span className="text-[#FF2B85] font-black">*</span>
            </span>
          </button>
        )}

        {onSettingsClick ? (
          <button
            type="button"
            onClick={onSettingsClick}
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-zinc-500/10 transition-all duration-150 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
        ) : (
          <Link
            href="/settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-zinc-500/10 transition-all duration-150 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>
        )}
      </div>
    </header>
  );
}
