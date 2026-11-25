import { motion } from 'motion/react';

export function ChatSkeletonList() {
  return (
    <motion.div
      data-testid="chat-skeleton-list"
      aria-label="Loading chat messages"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3.5 w-full pb-8"
    >
      {/* Divider skeleton */}
      <div className="flex justify-center my-1">
        <div className="h-5 w-24 rounded-full bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
      </div>

      {/* User message skeleton (light grey, 95% width) */}
      <div className="w-[95%] mx-auto rounded-xl px-4 py-3.5 bg-[#f2f3f5] dark:bg-[#23262e] border border-[#e3e5e8] dark:border-zinc-700/80 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-300/80 dark:bg-zinc-700 shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded bg-zinc-300/90 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-700/70 animate-pulse" />
          </div>
          <div className="h-3.5 w-[92%] rounded bg-zinc-300/70 dark:bg-zinc-700/80 animate-pulse" />
          <div className="h-3.5 w-[68%] rounded bg-zinc-300/60 dark:bg-zinc-700/60 animate-pulse" />
        </div>
      </div>

      {/* Bot message + code block skeleton (faded blue, 95% width) */}
      <div className="w-[95%] mx-auto rounded-xl px-4 py-3.5 bg-[#ebf3ff] dark:bg-[#17243a] border border-[#d2e3ff] dark:border-[#243b61] flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#cfe1ff] dark:bg-[#243b61] shrink-0 animate-pulse" />
        <div className="flex-1 space-y-3 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-28 rounded bg-[#bfd7ff] dark:bg-[#29436e] animate-pulse" />
            <div className="h-3.5 w-12 rounded bg-[#d2e3ff] dark:bg-[#213659] animate-pulse" />
            <div className="h-3 w-10 rounded bg-[#d9e8ff] dark:bg-[#1e3152] animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-[95%] rounded bg-[#cfe1ff] dark:bg-[#243b61] animate-pulse" />
            <div className="h-3.5 w-[80%] rounded bg-[#d9e8ff] dark:bg-[#1f3457] animate-pulse" />
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-[#121a29] border border-[#d2e3ff] dark:border-[#243b61] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </div>
            <div className="h-3 w-[88%] rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3 w-[74%] rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3 w-[82%] rounded bg-zinc-200/70 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </div>

      {/* User follow-up skeleton (light grey, 95% width) */}
      <div className="w-[95%] mx-auto rounded-xl px-4 py-3.5 bg-[#f2f3f5] dark:bg-[#23262e] border border-[#e3e5e8] dark:border-zinc-700/80 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-300/80 dark:bg-zinc-700 shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded bg-zinc-300/90 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-700/70 animate-pulse" />
          </div>
          <div className="h-3.5 w-[76%] rounded bg-zinc-300/70 dark:bg-zinc-700/80 animate-pulse" />
        </div>
      </div>

      {/* Bot note skeleton (faded blue, 95% width) */}
      <div className="w-[95%] mx-auto rounded-xl px-4 py-3.5 bg-[#ebf3ff] dark:bg-[#17243a] border border-[#d2e3ff] dark:border-[#243b61] flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#cfe1ff] dark:bg-[#243b61] shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded bg-[#bfd7ff] dark:bg-[#29436e] animate-pulse" />
            <div className="h-3 w-10 rounded bg-[#d9e8ff] dark:bg-[#1e3152] animate-pulse" />
          </div>
          <div className="h-3.5 w-[90%] rounded bg-[#cfe1ff] dark:bg-[#243b61] animate-pulse" />
          <div className="h-3.5 w-[64%] rounded bg-[#d9e8ff] dark:bg-[#1f3457] animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
