"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOTS, LEVELS, type Level } from "@/lib/bots";
import { useSettings } from "@/lib/settings";

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
}

export function SettingsDrawer({ onClose }: SettingsDrawerProps) {
  const { s, setTheme, setLevel } = useSettings();
  const [isSaved, setIsSaved] = useState(false);
  const dark = s.theme === "dark";

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
      <div className="flex-1 min-h-0 flex flex-col rounded-t-[26px] pt-[2px] px-[1.5px] pb-0 madbots-chat-neon-frame max-w-3xl w-full mx-auto">
        <section
          aria-label="Settings"
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-t-[24.5px] bg-[var(--ui-sheet)]"
        >
          {/* Top Draggable Swipe Handle + Sticky Settings Title */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="shrink-0 z-30 pt-1 pb-2 touch-none cursor-grab active:cursor-grabbing"
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

            <div className="w-[95%] mx-auto flex items-center justify-between px-3 py-2 rounded-2xl bg-[var(--ui-card)]/95 backdrop-blur-md border border-[var(--ui-border)] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff1493] text-[20px]">auto_awesome</span>
                <span className="font-bold text-[var(--ui-text)] tracking-tight text-[15px] font-headline">
                  MaDbotS Config
                </span>
              </div>
              <svg className="w-14 h-3.5 text-[#e40a65]" fill="none" viewBox="0 0 70 16">
                <path
                  d="M2 12C10 2 15 14 25 5C35 -4 40 15 50 6C58 -2 62 13 68 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          {/* Scrollable Settings Body */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto px-4 pt-2 pb-10 flex flex-col gap-[19px]">
            {/* Dark Mode Switch */}
            <div className="bg-[var(--ui-card)] p-5 rounded-2xl shadow-sm border border-[var(--ui-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--ui-sheet)] flex items-center justify-center text-[var(--ui-text)]">
                    <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[var(--ui-text)] leading-snug">
                      Dark Night Mode
                    </p>
                    <p className="text-[12px] text-[var(--ui-muted)]">
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

            {/* Thinking Level for Each Bot */}
            {BOTS.map((bot) => {
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
                <div
                  key={bot.id}
                  className="bg-[var(--ui-card)] p-5 rounded-2xl shadow-sm space-y-[15px] border border-[var(--ui-border)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-12 shrink-0">
                        {bot.avatar ? (
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            className="w-16 h-12 rounded-2xl object-cover shadow-sm border border-zinc-300 dark:border-zinc-600"
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
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ui-text)] text-[15px] font-headline">
                            {bot.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold text-[10px] ${tagBg}`}
                          >
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
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{ width: LEVEL_PERCENTAGES[currentLevel], background: accentColor }}
                        />
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
                              className={`rounded-full flex items-center justify-center shadow-sm cursor-pointer focus:outline-none ring-2 ring-[var(--ui-card)] transition-all ${
                                isCurrent
                                  ? "w-6 h-6 text-white scale-110 shadow-md"
                                  : isActive
                                  ? "w-5 h-5 text-white"
                                  : "w-5 h-5 bg-zinc-300 dark:bg-zinc-600 text-zinc-600"
                              }`}
                              style={isActive ? { background: accentColor } : {}}
                              type="button"
                            />
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-2 font-medium text-[var(--ui-muted)] text-[10px]">
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
            })}

            {/* Save Preferences Button */}
            <div className="pt-1 pb-6">
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
