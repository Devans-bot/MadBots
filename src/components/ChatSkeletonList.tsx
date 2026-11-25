"use client";

interface ChatSkeletonListProps {
  botId?: string;
}

export function ChatSkeletonList({ botId }: ChatSkeletonListProps) {
  const isMacro = botId === "madrix-macros";
  const isBhima = botId === "bhima-coach";

  const botCardBg = isMacro
    ? "bg-[#ecfdf5]/85 dark:bg-emerald-500/12 border-l-[3px] border-l-emerald-500 backdrop-blur-md"
    : isBhima
    ? "bg-[#fff7ed]/85 dark:bg-orange-500/12 border-l-[3px] border-l-orange-500 backdrop-blur-md"
    : "bg-[#ebf3ff]/85 dark:bg-blue-500/12 border-l-[3px] border-l-[#0066ff] backdrop-blur-md";

  const botBarStrong = isMacro
    ? "bg-emerald-200/80 dark:bg-emerald-400/25"
    : isBhima
    ? "bg-orange-200/80 dark:bg-orange-400/25"
    : "bg-[#cfe1ff] dark:bg-blue-400/25";

  const botBarSoft = isMacro
    ? "bg-emerald-100 dark:bg-emerald-400/15"
    : isBhima
    ? "bg-orange-100 dark:bg-orange-400/15"
    : "bg-[#d9e8ff] dark:bg-blue-400/15";

  return (
    <div
      data-testid="chat-skeleton-list"
      aria-label="Loading chat messages"
      role="status"
      className="flex flex-col gap-[4px] w-full pb-8 animate-pulse"
    >
      {/* Divider skeleton */}
      <div className="flex justify-center my-1">
        <div className="h-4 w-20 rounded-full bg-zinc-200/80 dark:bg-zinc-800" />
      </div>

      {/* User message skeleton (light grey) */}
      <div className="w-full rounded-r-lg rounded-l-[3px] p-1.5 bg-[#f2f3f5]/85 dark:bg-zinc-500/15 border-l-[3px] border-l-zinc-400 dark:border-l-zinc-500 backdrop-blur-md flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-300/80 dark:bg-zinc-700 shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded bg-zinc-300/90 dark:bg-zinc-700" />
            <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700/70" />
          </div>
          <div className="h-3.5 w-[90%] rounded bg-zinc-300/70 dark:bg-zinc-700/80" />
          <div className="h-3.5 w-[65%] rounded bg-zinc-300/60 dark:bg-zinc-700/60" />
        </div>
      </div>

      {/* Bot message skeleton (matches bot color) */}
      <div className={`w-full rounded-r-lg rounded-l-[3px] p-1.5 flex items-start gap-3 ${botCardBg}`}>
        <div className={`w-9 h-9 rounded-full shrink-0 ${botBarStrong}`} />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <div className={`h-3.5 w-24 rounded ${botBarStrong}`} />
            <div className={`h-3.5 w-10 rounded ${botBarSoft}`} />
            <div className={`h-3 w-12 rounded ${botBarSoft}`} />
          </div>
          <div className="space-y-1.5">
            <div className={`h-3.5 w-[94%] rounded ${botBarStrong}`} />
            <div className={`h-3.5 w-[78%] rounded ${botBarSoft}`} />
            <div className={`h-3.5 w-[60%] rounded ${botBarSoft}`} />
          </div>
        </div>
      </div>

      {/* User follow-up skeleton (light grey) */}
      <div className="w-full rounded-r-lg rounded-l-[3px] p-1.5 bg-[#f2f3f5]/85 dark:bg-zinc-500/15 border-l-[3px] border-l-zinc-400 dark:border-l-zinc-500 backdrop-blur-md flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-300/80 dark:bg-zinc-700 shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded bg-zinc-300/90 dark:bg-zinc-700" />
            <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700/70" />
          </div>
          <div className="h-3.5 w-[72%] rounded bg-zinc-300/70 dark:bg-zinc-700/80" />
        </div>
      </div>

      {/* Bot reply skeleton (matches bot color) */}
      <div className={`w-full rounded-r-lg rounded-l-[3px] p-1.5 flex items-start gap-3 ${botCardBg}`}>
        <div className={`w-9 h-9 rounded-full shrink-0 ${botBarStrong}`} />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className={`h-3.5 w-20 rounded ${botBarStrong}`} />
            <div className={`h-3 w-12 rounded ${botBarSoft}`} />
          </div>
          <div className={`h-3.5 w-[88%] rounded ${botBarStrong}`} />
          <div className={`h-3.5 w-[62%] rounded ${botBarSoft}`} />
        </div>
      </div>
    </div>
  );
}
