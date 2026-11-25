import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCheck, Moon, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { BotAvatar } from '../components/BotAvatar';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { ThinkingLevelMeter } from '../components/ThinkingLevelMeter';
import { useApp } from '../context/AppContext';
import type { ThinkingLevel } from '../types';

export function SettingsView() {
  const {
    bots,
    isDarkMode,
    setDarkMode,
    navigate,
    savePreferences,
  } = useApp();

  const [draftLevels, setDraftLevels] = useState<Record<string, ThinkingLevel>>(
    () => {
      const initial: Record<string, ThinkingLevel> = {};
      bots.forEach((b) => {
        initial[b.id] = b.thinkingLevel;
      });
      return initial;
    },
  );
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setDraftLevels((prev) => {
      const next = { ...prev };
      bots.forEach((b) => {
        if (next[b.id] === undefined) {
          next[b.id] = b.thinkingLevel;
        }
      });
      return next;
    });
  }, [bots]);

  const handleSave = () => {
    savePreferences(isDarkMode, draftLevels);
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1800);
  };

  return (
    <div className="madbots-charcoal-backdrop text-[#1a1c1c] dark:text-zinc-100 flex flex-col min-h-dvh select-none">
      <main className="flex-1 flex flex-col pt-safe max-w-xl lg:max-w-4xl mx-auto w-full pt-5 sm:pt-8">
        <div className="flex flex-col w-full flex-1">
          {/* Header Section matching settings_e2801e7d.png */}
          <header className="px-5 pt-2 pb-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => navigate({ name: 'home' })}
                className="w-10 h-10 rounded-full bg-white/12 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-[20px] font-bold tracking-tight text-white leading-none">
                Settings
              </h1>
            </div>
          </header>

          {/* Rounded Sheet Canvas matching settings_e2801e7d.png */}
          <section className="relative flex-1 bg-[#f7f7f6] dark:bg-[#14171c] rounded-t-[32px] pt-6 px-4 sm:px-6 pb-10 space-y-5 shadow-xl border-t border-white/40 dark:border-zinc-800">
            {/* Sketch Accent Motif */}
            <div className="flex items-center justify-between px-1.5 pt-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ff1493]" />
                <span className="font-bold text-[#1a1c1c] dark:text-zinc-50 tracking-tight text-[16px]">
                  MaDbotS Config
                </span>
              </div>
              <svg
                aria-hidden="true"
                className="w-16 h-4 text-[#e40a65]"
                fill="none"
                viewBox="0 0 70 16"
              >
                <path
                  d="M2 12C10 2 15 14 25 5C35 -4 40 15 50 6C58 -2 62 13 68 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            {/* Section 1: Dark Mode Switch */}
            <div className="bg-white dark:bg-[#1c1f24] p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-zinc-200/50 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#f1f1f0] dark:bg-zinc-800 flex items-center justify-center text-[#1a1c1c] dark:text-zinc-100 shrink-0">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#1a1c1c] dark:text-zinc-50 leading-snug">
                      Dark Night Mode
                    </p>
                    <p className="text-[13px] text-[#424656] dark:text-zinc-400 leading-snug">
                      Deep graphite theme for late night work
                    </p>
                  </div>
                </div>

                <ThemeSwitch checked={isDarkMode} onChange={setDarkMode} />
              </div>
            </div>

            {/* Section 2 & 3: Bot Thinking Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bots.map((bot) => {
                const currentLevel = draftLevels[bot.id] ?? bot.thinkingLevel;
                const isPink = bot.accent === 'pink';
                const displayName = bot.settingsName || bot.name;

                return (
                  <div
                    key={bot.id}
                    className="bg-white dark:bg-[#1c1f24] p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-zinc-200/50 dark:border-zinc-800 space-y-5"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <BotAvatar
                            bot={bot}
                            size="lg"
                            paletteTone="pink"
                          />
                          <span
                            aria-hidden="true"
                            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#1c1f24] ${
                              isPink ? 'bg-[#ff1493]' : 'bg-[#0066ff]'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1a1c1c] dark:text-zinc-50 text-[15px] truncate">
                              {displayName}
                            </span>
                            <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-900 dark:text-zinc-200 shrink-0">
                              {bot.model}
                            </span>
                          </div>
                          <p className="text-[#424656] dark:text-zinc-400 text-[11.5px] truncate mt-0.5">
                            {bot.role}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold text-[11px] px-2.5 py-1 rounded-md shrink-0 ${
                          isPink
                            ? 'bg-[#ffe6f3] dark:bg-[#ff1493]/18 text-[#ff1493] dark:text-[#ff66b8]'
                            : 'bg-[#e6f0ff] dark:bg-[#0066ff]/18 text-[#0066ff] dark:text-[#66a3ff]'
                        }`}
                      >
                        {bot.tierLabel}
                      </span>
                    </div>

                    <ThinkingLevelMeter
                      botName={bot.name}
                      category={bot.category}
                      accent={bot.accent}
                      level={currentLevel}
                      onChange={(nextLevel) => {
                        setDraftLevels((prev) => ({
                          ...prev,
                          [bot.id]: nextLevel,
                        }));
                        setIsSaved(false);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Section 4: Primary Pill Button matching settings_e2801e7d.png */}
            <div className="pt-2 pb-safe max-w-md mx-auto w-full">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="w-full py-4 px-6 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer bg-[#1a1d21] hover:bg-zinc-900 dark:bg-[#0066ff] dark:hover:bg-[#0050cb] text-white"
              >
                <span>{isSaved ? 'Saved!' : 'Save Preferences'}</span>
                <CheckCheck className="w-4 h-4" />
              </motion.button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
