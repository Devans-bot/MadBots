"use client";

import { useState } from "react";
import { BOTS } from "@/lib/bots";

interface MarketplaceDrawerProps {
  addedBotIds: string[];
  onClose: () => void;
  onAddBot: (botId: string) => Promise<void>;
  onRemoveBot: (botId: string) => Promise<void>;
}

export function MarketplaceDrawer({
  addedBotIds,
  onClose,
  onAddBot,
  onRemoveBot,
}: MarketplaceDrawerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div
      data-testid="marketplace-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-[26px] sm:rounded-[24px] bg-[var(--ui-sheet)] border border-[var(--ui-border)] shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-card)] flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-[var(--ui-text)] font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#0066ff]">storefront</span>
              Bot Marketplace
            </h2>
            <p className="text-[12px] text-[var(--ui-muted)]">
              Add specialized AI agents to your workspace (all free)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close marketplace"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {BOTS.map((bot) => {
            const isAdded = addedBotIds.includes(bot.id);
            const busy = pendingId === bot.id;

            return (
              <div
                key={bot.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {bot.avatar ? (
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ background: bot.color }}
                    >
                      {bot.initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14.5px] text-[var(--ui-text)] truncate">
                        {bot.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                        FREE
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--ui-muted)] line-clamp-2 mt-0.5">
                      {bot.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setPendingId(bot.id);
                    try {
                      if (isAdded) {
                        await onRemoveBot(bot.id);
                      } else {
                        await onAddBot(bot.id);
                      }
                    } finally {
                      setPendingId(null);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-[12.5px] font-bold shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                    isAdded
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 hover:bg-red-500/15"
                      : "bg-[#0066ff] text-white hover:bg-[#0050cb] shadow-xs"
                  }`}
                >
                  {busy ? "..." : isAdded ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
