"use client";
import type { Bot } from "@/lib/bots";

const BOT_BIOS: Record<string, string> = {
  "madrix-macros":
    "Precision nutrition & macro tracking agent. Parses messy meal logs, cross-checks your personal & restaurant food databases, enforces your custom protein rules, and outputs verified calorie & macro breakdowns.",
  "bhima-coach":
    "Old-school akhada strength & conditioning coach. Helps you hit new PRs, track BMI, structure progressive overload, and dial in high-protein desi khurak.",
  "madrix-codes":
    "Sharp full-stack engineering & debugging partner. Helps diagnose tricky bugs, refactor messy code, and ship clean architecture fast.",
  "madrix-rehab":
    "Calm sports physiotherapist focused on sustainable injury recovery, joint mobility drills, and pain-free exercise substitutions.",
};

interface BotProfileViewProps {
  bot: Bot;
  onBack: () => void;
}

export function BotProfileView({ bot, onBack }: BotProfileViewProps) {
  const bio =
    BOT_BIOS[bot.id] ||
    bot.customConfig?.soul?.trim() ||
    bot.tagline;

  return (
    <div
      data-testid="bot-profile-page"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--ui-bg)] madbots-graph-grid overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* Ambient top glow matching bot color */}
      <div
        className="pointer-events-none absolute top-0 inset-x-0 h-56 opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 20%, ${bot.color}, transparent 70%)` }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-10 shrink-0 pt-safe px-4 py-3 flex items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-card)]/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chat"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ui-text)] hover:bg-zinc-500/10 transition-colors cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[21px]">arrow_back</span>
        </button>
        <span className="font-bold text-[15px] text-[var(--ui-text)] font-headline">
          Bot Profile
        </span>
      </header>

      {/* Main Profile Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-5 pt-8 pb-10 max-w-md w-full mx-auto">
        {/* Big Bot Icon */}
        <div className="relative">
          {bot.avatar ? (
            <img
              src={bot.avatar}
              alt={bot.name}
              className="w-28 h-28 rounded-[28px] object-cover border-2 border-white dark:border-zinc-700 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
            />
          ) : (
            <div
              className="w-28 h-28 rounded-[28px] flex items-center justify-center font-black text-white text-4xl border-2 border-white dark:border-zinc-700 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
              style={{ background: bot.color }}
            >
              {bot.initial}
            </div>
          )}
          <span
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#23a55a] border-[3px] border-[var(--ui-bg)] shadow-xs"
            title="Online"
          />
        </div>

        {/* Bot Name + Badges */}
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[var(--ui-text)] font-headline">
              {bot.name}
            </h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] bg-[#5865F2] text-white text-[10px] font-bold tracking-wide uppercase leading-none">
              APP
            </span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-[var(--ui-muted)] max-w-xs">
            {bot.tagline}
          </p>
        </div>

        {/* Bio Card */}
        <div className="mt-6 w-full rounded-2xl bg-[var(--ui-card)]/90 backdrop-blur-md border border-[var(--ui-border)] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-muted)]">
              Bio
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-[var(--ui-text)]">
            {bio}
          </p>
        </div>

        {/* Back to Chat Action */}
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full py-3 rounded-2xl font-semibold text-[14px] text-white shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          style={{ backgroundColor: bot.color }}
        >
          <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
          <span>Message @{bot.name}</span>
        </button>
      </main>
    </div>
  );
}
