import { Palette, Sparkles } from 'lucide-react';
import type { BotAgent } from '../types';

interface BotAvatarProps {
  bot: BotAgent;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  paletteTone?: 'ink' | 'pink';
}

const SIZE_CLASSES = {
  xs: 'w-4 h-4 rounded-sm',
  sm: 'w-10 h-10 rounded-xl',
  md: 'w-11 h-11 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
};

export function BotAvatar({
  bot,
  size = 'md',
  showStatus = false,
  paletteTone = 'ink',
}: BotAvatarProps) {
  const boxClass = SIZE_CLASSES[size];

  return (
    <div className="relative shrink-0">
      {bot.avatarVariant === 'nexus' ? (
        <div
          className={`${boxClass} overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-[#FFF033] flex items-center justify-center shadow-xs`}
        >
          {/* Playful cartoon green alligator/crocodile mascot matching MaDbotS reference */}
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            aria-hidden="true"
          >
            {/* Bright yellow background */}
            <rect width="48" height="48" fill="#FFF033" />
            {/* Back ridges / spikes */}
            <path
              d="M9 21 L12 18 L12 24 Z M8 27 L12 24.5 L12 30 Z M8 33 L12 30.5 L12 36 Z M8 39 L12 36.5 L12 42 Z"
              fill="#1E8A3B"
              stroke="#143D1F"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Crocodile neck & head body */}
            <path
              d="M12 48 L12 20 C12 14 15.5 11 20.5 11 C24.5 11 27.5 13.5 28.5 17.5 L38.5 19.5 C41.5 20 43 22 43 24.5 C43 27.2 41 29.2 38 29.5 L28.5 30 L28.5 48 Z"
              fill="#46C952"
              stroke="#143D1F"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            {/* Lighter green belly stripes */}
            <path
              d="M21 32 L28 32 M21 36.5 L28 36.5 M21 41 L28 41 M21 45.5 L28 45.5"
              stroke="#2C9C3C"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Cheek / snout shading */}
            <path
              d="M15 24 Q18 23 20 25"
              stroke="#2C9C3C"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Big cartoon eyes */}
            <ellipse
              cx="19.5"
              cy="12.5"
              rx="4.2"
              ry="4.8"
              fill="#FFFFFF"
              stroke="#143D1F"
              strokeWidth="1.6"
            />
            <ellipse
              cx="26.5"
              cy="13"
              rx="4"
              ry="4.5"
              fill="#FFFFFF"
              stroke="#143D1F"
              strokeWidth="1.6"
            />
            {/* Pupils */}
            <circle cx="20.6" cy="12.8" r="1.5" fill="#14181F" />
            <circle cx="27.4" cy="13.2" r="1.5" fill="#14181F" />
            {/* Nostril */}
            <circle cx="38.5" cy="22.2" r="1" fill="#143D1F" />
            {/* Toothy grin line */}
            <path
              d="M23 26.8 L39.5 26.8"
              stroke="#143D1F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Cute white teeth */}
            <path
              d="M26 26.8 L27.5 29.6 L29 26.8 Z M31.5 26.8 L33 29.6 L34.5 26.8 Z M36.5 26.8 L37.8 29.3 L39.1 26.8 Z"
              fill="#FFFFFF"
              stroke="#143D1F"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : bot.avatarVariant === 'aura' ? (
        <div
          className={`${boxClass} bg-[#f3f4f3] dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center ${
            paletteTone === 'pink'
              ? 'text-[#ff1493]'
              : 'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          <Palette
            className={
              size === 'xs'
                ? 'w-2.5 h-2.5'
                : size === 'sm'
                  ? 'w-5 h-5'
                  : 'w-6 h-6'
            }
            strokeWidth={2}
          />
        </div>
      ) : (
        <div
          className={`${boxClass} border flex items-center justify-center font-bold ${
            bot.accent === 'pink'
              ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800 text-[#ff1493]'
              : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-[#0066ff]'
          }`}
        >
          {size === 'xs' ? (
            <span className="text-[7px] font-extrabold leading-none">
              {bot.shortInitial}
            </span>
          ) : size === 'sm' ? (
            <span className="text-xs font-extrabold">{bot.shortInitial}</span>
          ) : (
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          )}
        </div>
      )}

      {showStatus && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              bot.status === 'online' ? 'bg-[#10b981]' : 'bg-[#f5b726]'
            }`}
          />
        </span>
      )}
    </div>
  );
}
