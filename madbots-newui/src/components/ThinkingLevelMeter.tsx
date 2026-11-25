import { motion } from 'motion/react';
import {
  getThinkingLevelMeta,
  getThinkingLevelsForCategory,
} from '../lib/botEngine';
import type { BotCategory, BotThemeAccent, ThinkingLevel } from '../types';

interface ThinkingLevelMeterProps {
  botName: string;
  category: BotCategory;
  accent: BotThemeAccent;
  level: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
}

const TRACK_FILL_PERCENTAGES: Record<ThinkingLevel, string> = {
  0: '10%',
  1: '43%',
  2: '73%',
  3: '100%',
};

export function ThinkingLevelMeter({
  botName,
  category,
  accent,
  level,
  onChange,
}: ThinkingLevelMeterProps) {
  const levels = getThinkingLevelsForCategory(category);
  const currentMeta = getThinkingLevelMeta(category, level);
  const isPink = accent === 'pink';

  const fillBg = isPink ? 'bg-[#ff1493]' : 'bg-[#0066ff]';
  const activeText = isPink
    ? 'text-[#ff1493] dark:text-[#ff5db5]'
    : 'text-[#0066ff] dark:text-[#4d94ff]';
  const pillStyle = isPink
    ? 'bg-[#ffe6f3] dark:bg-[#ff1493]/18 text-[#e40a65] dark:text-[#ff66b8]'
    : 'bg-[#e6f0ff] dark:bg-[#0066ff]/18 text-[#0066ff] dark:text-[#66a3ff]';

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[#1a1c1c] dark:text-zinc-100 flex items-center gap-2 text-[12px] leading-tight">
          <span>Thinking level</span>
          <span aria-hidden="true" className="text-[13px]">
            💡
          </span>
        </span>
        <span
          className={`font-bold text-[11px] px-3 py-1 rounded-full whitespace-nowrap ${pillStyle}`}
        >
          {currentMeta.label}
        </span>
      </div>

      <div className="relative py-2 px-0.5">
        {/* Track */}
        <div className="w-full h-2 rounded-full bg-[#eeeeed] dark:bg-zinc-800 overflow-hidden relative">
          <motion.div
            className={`h-full rounded-full ${fillBg}`}
            initial={false}
            animate={{ width: TRACK_FILL_PERCENTAGES[level] }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        </div>

        {/* Solid Step Knobs matching settings_e2801e7d.png */}
        <div className="flex justify-between items-center -mt-4 relative z-10">
          {levels.map((stepMeta) => {
            const isActive = level >= stepMeta.level;
            const isCurrent = level === stepMeta.level;
            return (
              <motion.button
                key={stepMeta.level}
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label={`${botName} thinking level ${stepMeta.shortName}`}
                aria-pressed={isCurrent}
                onClick={() => onChange(stepMeta.level)}
                className={`rounded-full flex items-center justify-center cursor-pointer ring-2 ring-white dark:ring-[#1c1f24] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066ff] ${
                  isCurrent
                    ? `w-7 h-7 ${fillBg} shadow-md`
                    : isActive
                      ? `w-5.5 h-5.5 ${fillBg}`
                      : 'w-5.5 h-5.5 bg-[#e2e2e2] dark:bg-zinc-700'
                }`}
              />
            );
          })}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between items-center pt-2 font-medium text-[#525666] dark:text-zinc-400 text-[11px]">
          {levels.map((stepMeta) => {
            const isCurrent = level === stepMeta.level;
            return (
              <button
                key={stepMeta.level}
                type="button"
                onClick={() => onChange(stepMeta.level)}
                className={`cursor-pointer py-0.5 transition-colors ${
                  isCurrent
                    ? `font-bold ${activeText}`
                    : 'hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {stepMeta.shortName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
