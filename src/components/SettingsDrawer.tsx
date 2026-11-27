"use client";
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

interface SettingsDrawerProps {
  onClose: () => void;
  installedBotIds?: string[];
}

export function SettingsDrawer({ onClose, installedBotIds }: SettingsDrawerProps) {
  const { s, setTheme, setLevel } = useSettings();
  const [isSaved, setIsSaved] = useState(false);
  const [fetchedBotIds, setFetchedBotIds] = useState<string[] | null>(null);
  const dark = s.theme === "dark";

  useEffect(() => {
    if (installedBotIds) return;
    fetch("/api/bots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.botIds)) setFetchedBotIds(d.botIds);
      })
      .catch(() => {});
  }, [installedBotIds]);

  const effectiveBotIds = installedBotIds ?? fetchedBotIds ?? [];
  const installedBots = BOTS.filter((b) => effectiveBotIds.includes(b.id));

  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);
  const isClosingRef = useRef(false);

  // Slide upwards from bottom to top (identical to ChatDrawer)
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { y: "100%" },
      { y: 0, duration: 0.65, ease: "power3.out" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  const animateClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const el = drawerRef.current;
    if (!el) {
      onClose();
      return;
    }
    gsap.to(el, {
      y: "100%",
      duration: 0.45,
      ease: "power3.in",
      onComplete: () => {
        onClose();
      },
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isClosingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragDeltaYRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null || isClosingRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartYRef.current);
    dragDeltaYRef.current = delta;
    if (drawerRef.current) {
      gsap.set(drawerRef.current, { y: delta });
    }
  };

  const handlePointerUp = () => {
    if (dragStartYRef.current === null || isClosingRef.current) return;
    const delta = dragDeltaYRef.current;
    dragStartYRef.current = null;
    dragDeltaYRef.current = 0;

    if (delta > 55) {
      animateClose();
    } else if (delta > 3) {
      if (drawerRef.current) {
        gsap.to(drawerRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
      }
    } else {
      animateClose();
    }
  };

  const saveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1600);
  };

  return (
    <div
      ref={drawerRef}
      data-testid="settings-sheet"
      className="absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+53px)] bottom-0 z-40 flex flex-col bg-transparent overflow-visible select-none"
    >
      <div className="flex-1 min-h-0 flex flex-col rounded-t-[30px] pt-[2px] px-[1.5px] pb-0 madbots-chat-neon-frame max-w-3xl w-full mx-auto">
        <section
          aria-label="Settings"
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-t-[28px] bg-[var(--ui-sheet)]"
        >
          {/* Top Draggable Swipe Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="shrink-0 z-30 pt-1 pb-1.5 touch-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-center">
              <button
                type="button"
                aria-label="Swipe down or click to close settings"
                className="group w-36 h-6 flex items-center justify-center rounded-full focus:outline-none"
              >
                <span className="w-14 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Scrollable Settings Body */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto px-3.5 pt-2 pb-10 flex flex-col gap-3.5">
            {/* Dark Mode Switch */}
            <div className="bg-[var(--ui-card)] px-4 py-3 rounded-2xl shadow-sm border border-[var(--ui-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--ui-sheet)] flex items-center justify-center text-[var(--ui-text)]">
                    <span className="material-symbols-outlined text-[19px]">dark_mode</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[var(--ui-text)] leading-snug">
                      Dark Night Mode
                    </p>
                    <p className="text-[11.5px] text-[var(--ui-muted)]">
                      Deep theme for late night work
                    </p>
                  </div>
                </div>
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
                    {dark && (
                      <span className="material-symbols-outlined text-[14px] text-[#0066ff]">
                        check
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* User Profile, Login Details, Synced Apps & DP Selector */}
            <UserProfileSettingsCard />

            {/* Thinking Level for Installed Bots Only */}
            {installedBots.length === 0 ? (
              <div className="bg-[var(--ui-card)] px-4 py-4 rounded-2xl border border-[var(--ui-border)] text-center text-[12.5px] text-[var(--ui-muted)]">
                No bots installed yet. Add one from the Marketplace.
              </div>
            ) : (
              installedBots.map((bot) => {
              const currentLevel = s.levels[bot.id] ?? bot.level;
              const isMacro = bot.id === "madrix-macros";
              const isBhima = bot.id === "bhima-coach";
              const sliderColor = "#0066ff";
              const tagBg = isMacro
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                : isBhima
                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                : "bg-blue-100 text-[#0066ff] dark:bg-blue-950/60 dark:text-blue-400";
              const tagLabel = isMacro ? "Nutrition" : isBhima ? "Fitness" : "Coding";

              return (
                <div
                  key={bot.id}
                  className="bg-[var(--ui-card)] px-4 py-3 rounded-2xl shadow-sm space-y-2.5 border border-[var(--ui-border)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-12 h-10 shrink-0">
                        {bot.avatar ? (
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            className="w-12 h-10 rounded-xl object-cover shadow-sm border border-zinc-300 dark:border-zinc-600"
                          />
                        ) : (
                          <div
                            className="w-12 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                            style={{ background: bot.color }}
                          >
                            {bot.initial}
                          </div>
                        )}
                        <span
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--ui-card)]"
                          style={{ background: sliderColor }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--ui-text)] text-[14.5px] font-headline">
                            {bot.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded uppercase tracking-wider font-bold text-[9.5px] ${tagBg}`}
                          >
                            {tagLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-md font-semibold text-[10px]"
                      style={{ color: sliderColor, background: `${sliderColor}15` }}
                    >
                      Active
                    </span>
                  </div>

                  {/* Thinking Level Meter (All blue sliders) */}
                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[var(--ui-text)] flex items-center gap-1 text-[11px]">
                        <span>Thinking level</span>
                        <span className="text-[11px]">💡</span>
                      </label>
                      <span
                        className="font-bold px-2 py-0.5 rounded-full text-[10px]"
                        style={{ color: sliderColor, background: `${sliderColor}15` }}
                      >
                        {LEVEL_LABELS[currentLevel]}
                      </span>
                    </div>

                    <div className="relative py-1.5 px-0.5">
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{ width: LEVEL_PERCENTAGES[currentLevel], background: sliderColor }}
                        />
                      </div>

                      <div className="flex justify-between items-center -mt-3 relative z-10 px-0.5">
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
                              className={`rounded-full flex items-center justify-center shadow-sm cursor-pointer focus:outline-none ring-2 ring-[var(--ui-card)] transition-all ${
                                isCurrent
                                  ? "w-5 h-5 text-white scale-110 shadow-md"
                                  : isActive
                                  ? "w-4 h-4 text-white"
                                  : "w-4 h-4 bg-zinc-300 dark:bg-zinc-600 text-zinc-600"
                              }`}
                              style={isActive ? { background: sliderColor } : {}}
                              type="button"
                            />
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-1.5 font-medium text-[var(--ui-muted)] text-[9.5px]">
                        {LEVELS.map((lvl) => (
                          <span
                            key={lvl}
                            className={`cursor-pointer capitalize ${
                              currentLevel === lvl ? "font-bold" : ""
                            }`}
                            style={currentLevel === lvl ? { color: sliderColor } : {}}
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

            {/* Save Preferences & Sign Out */}
            <div className="pt-1 pb-6 space-y-2.5">
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
        </section>
      </div>
    </div>
  );
}
