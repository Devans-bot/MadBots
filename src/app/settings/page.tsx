"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOTS, LEVELS, type Level } from "@/lib/bots";
import { useSettings } from "@/lib/settings";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UserProfileSettingsCard } from "@/components/UserProfileSettingsCard";

const LEVEL_LABELS: Record<Level, string> = {
  minimal: "Low • Fast draft",
  low: "Medium • Balanced speed",
  medium: "High • Extended reasoning",
  high: "Max • Deep verification",
};

const LEVEL_PERCENTAGES: Record<Level, string> = {
  minimal: "10%",
  low: "45%",
  medium: "75%",
  high: "100%",
};

export default function SettingsPage() {
  const { s, setTheme, setLevel } = useSettings();
  const [isSaved, setIsSaved] = useState(false);
  const [installedBotIds, setInstalledBotIds] = useState<string[]>([]);
  const dark = s.theme === "dark";
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/bots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.botIds)) setInstalledBotIds(d.botIds);
      })
      .catch(() => {});
  }, []);

  const installedBots = BOTS.filter((b) => installedBotIds.includes(b.id));

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });
      tl.fromTo(".settings-header", { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 })
        .fromTo(".settings-sheet", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.15")
        .fromTo(
          ".settings-squiggle",
          { strokeDasharray: 120, strokeDashoffset: 120 },
          { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" },
          "-=0.2"
        )
        .fromTo(".settings-card", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.07 }, "-=0.25");
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const saveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1600);
  };

  return (
    <div
      ref={pageRef}
      className="text-[var(--ui-text)] flex flex-col min-h-screen antialiased select-none font-sans"
      style={{
        background:
          "linear-gradient(rgb(26, 28, 28) 0%, rgb(43, 47, 56) 32%, rgb(229, 232, 236) 75%, rgb(249, 249, 248) 100%)",
      }}
    >
      <main className="flex-1 flex flex-col pt-safe px-0 max-w-xl mx-auto w-full" style={{ paddingTop: "24px" }}>
        <div className="flex flex-col w-full text-on-surface select-none pb-6">
          {/* Header Section */}
          <div className="settings-header px-5 pt-3 pb-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Go back"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none font-headline">Settings</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/chat/${BOTS[0].id}`}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[12px] font-bold hover:bg-white/20 transition-all flex items-center gap-1"
              >
                <span>Open Chat</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Rounded Sheet Canvas */}
          <div className="settings-sheet relative bg-[var(--ui-sheet)] rounded-t-[32px] pt-6 px-4 flex flex-col gap-[19px] shadow-xl">
            {/* Sketch Accent Motif */}
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff1493] text-[22px]">auto_awesome</span>
                <span className="font-bold text-[var(--ui-text)] tracking-tight text-[16px] font-headline">MaDbotS Config</span>
              </div>
              <svg className="w-16 h-4 text-[#e40a65]" fill="none" viewBox="0 0 70 16">
                <path
                  className="settings-squiggle"
                  d="M2 12C10 2 15 14 25 5C35 -4 40 15 50 6C58 -2 62 13 68 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>
              </svg>
            </div>

            {/* User Profile & Synced Apps */}
            <UserProfileSettingsCard />

            {/* Section 1: Dark Mode Switch */}
            <div className="settings-card bg-[var(--ui-card)] p-5 rounded-2xl shadow-sm space-y-4 border border-[var(--ui-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-sheet)] flex items-center justify-center text-[var(--ui-text)]">
                    <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[var(--ui-text)] leading-snug">Dark Night Mode</p>
                    <p className="text-[12px] text-[var(--ui-muted)]">Deep theme for late night work</p>
                  </div>
                </div>
                {/* Toggle Button */}
                <button
                  aria-label="Toggle theme"
                  onClick={() => setTheme(dark ? "light" : "dark")}
                  className={`px-0.5 rounded-full flex items-center transition-all duration-300 relative cursor-pointer ${
                    dark ? "bg-[#0066ff]" : "bg-zinc-200"
                  }`}
                  style={{ width: "52px", height: "28px" }}
                  type="button"
                >
                  <span
                    className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transform transition-all duration-300 ${
                      dark ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {dark && <span className="material-symbols-outlined text-[14px] text-[#0066ff]">check</span>}
                  </span>
                </button>
              </div>
            </div>

            {/* Section 2: Thinking Level for Each Bot */}
            {/* Section 2: Installed Bots */}
            {installedBots.length === 0 ? (
              <div className="bg-[var(--ui-card)] p-5 rounded-2xl border border-[var(--ui-border)] text-center text-[13px] text-[var(--ui-muted)]">
                No bots installed yet. Add one from the Marketplace.
              </div>
            ) : (
              installedBots.map((bot) => {
              const currentLevel = s.levels[bot.id] ?? bot.level;
              const isMacro = bot.id === "madrix-macros";
              const isBhima = bot.id === "bhima-coach";
              const accentColor = isMacro ? "#ff1493" : isBhima ? "#f59e0b" : "#0066ff";
              const tagBg = isMacro
                ? "bg-pink-100 text-[#ff1493]"
                : isBhima
                ? "bg-amber-100 text-[#d97706]"
                : "bg-blue-100 text-[#0066ff]";
              const tagLabel = isMacro ? "Nutrition" : isBhima ? "Fitness" : "Coding";

              return (
                <div key={bot.id} className="settings-card bg-[var(--ui-card)] p-5 rounded-2xl shadow-sm space-y-[15px] border border-[var(--ui-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-12 shrink-0">
                        {bot.avatar ? (
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            className="w-16 h-12 rounded-2xl object-cover shadow-sm border border-[var(--ui-border)]"
                          />
                        ) : (
                          <div
                            className="w-16 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-sm"
                            style={{ background: bot.color }}
                          >
                            {bot.initial}
                          </div>
                        )}
                        <span
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--ui-card)]"
                          style={{ background: accentColor }}
                        ></span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ui-text)] text-[15px] font-headline">{bot.name}</span>
                          <span className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold text-[10px] ${tagBg}`}>
                            {tagLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className="px-2 py-1 rounded-md font-semibold text-[10px]"
                      style={{ color: accentColor, background: `${accentColor}15` }}
                    >
                      Active
                    </span>
                  </div>

                  {/* Thinking Level Meter */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[var(--ui-text)] flex items-center gap-1.5 text-[11px]">
                        <span>Thinking level</span>
                        <span className="text-[12px]">💡</span>
                      </label>
                      <span
                        className="font-bold px-2.5 py-0.5 rounded-full text-[10px]"
                        style={{ color: accentColor, background: `${accentColor}15` }}
                      >
                        {LEVEL_LABELS[currentLevel]}
                      </span>
                    </div>

                    <div className="relative py-2 px-1">
                      <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{ width: LEVEL_PERCENTAGES[currentLevel], background: accentColor }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center -mt-3.5 relative z-10 px-0.5">
                        {LEVELS.map((lvl) => {
                          const lvlIndex = LEVELS.indexOf(lvl);
                          const currentIndex = LEVELS.indexOf(currentLevel);
                          const isActive = currentIndex >= lvlIndex;
                          const isCurrent = currentLevel === lvl;

                          return (
                            <button
                              key={lvl}
                              aria-label={`Select ${lvl} thinking level`}
                              onClick={() => setLevel(bot.id, lvl)}
                              className={`rounded-full flex items-center justify-center shadow-sm cursor-pointer focus:outline-none ring-2 ring-white transition-all ${
                                isCurrent
                                  ? "w-6 h-6 text-white scale-110 shadow-md"
                                  : isActive
                                  ? "w-5 h-5 text-white"
                                  : "w-5 h-5 bg-zinc-300 text-zinc-600"
                              }`}
                              style={isActive ? { background: accentColor } : {}}
                              type="button"
                            ></button>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-2 font-medium text-zinc-500 text-[10px]">
                        {LEVELS.map((lvl) => (
                          <span
                            key={lvl}
                            className={`cursor-pointer capitalize ${
                              currentLevel === lvl ? "font-bold" : ""
                            }`}
                            style={currentLevel === lvl ? { color: accentColor } : {}}
                            onClick={() => setLevel(bot.id, lvl)}
                          >
                            {lvl === "minimal" ? "Low" : lvl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}

            {/* Section 3: Action Buttons */}
            <div className="pt-2 pb-6 space-y-3">
              <button
                onClick={saveSettings}
                className={`w-full py-3.5 px-6 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md cursor-pointer ${
                  isSaved ? "bg-emerald-600 text-white" : "bg-zinc-950 hover:bg-zinc-800 text-white"
                }`}
                type="button"
              >
                <span>{isSaved ? "Saved Configuration!" : "Save Preferences"}</span>
                <span className="material-symbols-outlined text-[18px]">
                  {isSaved ? "done_all" : "save"}
                </span>
              </button>

              <button
                onClick={async () => {
                  try {
                    const supabase = createSupabaseBrowserClient();
                    await supabase.auth.signOut();
                  } finally {
                    window.location.href = "/login";
                  }
                }}
                className="w-full py-3 px-6 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 active:scale-98 transition-all border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
