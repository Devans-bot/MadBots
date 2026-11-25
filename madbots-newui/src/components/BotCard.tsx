import { Code2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { BotAgent } from '../types';
import { BotAvatar } from './BotAvatar';

interface BotCardProps {
  bot: BotAgent;
  index: number;
  onSelect: (botId: string) => void;
}

export function BotCard({ bot, index, onSelect }: BotCardProps) {
  const CapabilityIcon =
    bot.capabilityIcon === 'code'
      ? Code2
      : bot.capabilityIcon === 'image'
        ? ImageIcon
        : Sparkles;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 1, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.16,
        delay: index * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(bot.id)}
      aria-label={`Open chat with ${bot.name} (${bot.model})`}
      className="group relative w-full text-left bg-white dark:bg-[#1c1f24] border border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-900 dark:hover:border-zinc-400 p-4 rounded-[12px] madbots-card-glow transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066ff]"
    >
      <div className="flex items-start gap-3.5">
        <BotAvatar bot={bot} size="md" showStatus paletteTone="ink" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] font-bold text-zinc-950 dark:text-white truncate">
                {bot.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-[5px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold shrink-0">
                {bot.model}
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold shrink-0 whitespace-nowrap tabular-nums ${
                bot.lastUpdated === 'Just now'
                  ? 'text-[#0066FF] dark:text-[#66a3ff]'
                  : 'text-zinc-400 dark:text-zinc-400'
              }`}
            >
              {bot.lastUpdated}
            </span>
          </div>

          <p className="font-body text-[13px] text-zinc-600 dark:text-zinc-300 font-normal line-clamp-1 mb-2.5">
            {bot.lastMessage}
          </p>

          <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-300 font-medium">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-2 py-0.5 rounded-[5px] shrink-0">
                <CapabilityIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{bot.capabilityLabel}</span>
              </span>

              {bot.showLatency !== false && (
                <span className="text-[#059669] dark:text-emerald-400 font-bold tabular-nums shrink-0">
                  {bot.latencyMs}ms
                </span>
              )}
            </div>

            {bot.unreadCount > 0 ? (
              <span
                aria-label={`${bot.unreadCount} unread messages`}
                className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                  bot.accent === 'blue'
                    ? 'bg-zinc-950 dark:bg-[#0066ff] text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-100'
                }`}
              >
                {bot.unreadCount}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0">
                Open →
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
