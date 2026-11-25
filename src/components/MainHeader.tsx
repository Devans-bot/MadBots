"use client";
import Link from "next/link";

interface MainHeaderProps {
  isChatOpen?: boolean;
  onHomeClick?: () => void;
  onSettingsClick?: () => void;
}

export function MainHeader({
  isChatOpen = false,
  onHomeClick,
  onSettingsClick,
}: MainHeaderProps) {
  return (
    <header
      data-testid="main-header"
      className={`relative z-20 shrink-0 pt-safe bg-[var(--ui-card)] transition-colors duration-200 ${
        isChatOpen
          ? "rounded-b-none shadow-none border-b-0"
          : "rounded-b-[22px] madbots-header-shadow border-b border-[var(--ui-border)]"
      }`}
    >
      {/* pt-3 (12px) + h-9 (36px) + pb-[15px] (15px) = 63px total; when drawer opens, header row pushes up 5px and drawer overlays bottom 10px */}
      <div
        className={`pt-3 pb-[15px] px-5 w-full flex items-center justify-between transition-transform duration-300 ease-out ${
          isChatOpen ? "-translate-y-[5px]" : "translate-y-0"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (onHomeClick) onHomeClick();
          }}
          aria-label="MaDbotS Home"
          className="h-9 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 rounded"
        >
          <img
            src="/icon-512.jpg"
            alt=""
            className="w-[18px] h-[18px] rounded-[5px] object-cover border border-zinc-300 dark:border-zinc-600 shrink-0"
          />
          <span className="font-black text-[19px] leading-none tracking-tighter text-[#22439E] dark:text-[#5b82e8] font-headline">
            MaDbotS<span className="text-[#FF2B85] font-black">*</span>
          </span>
        </button>

        {onSettingsClick ? (
          <button
            type="button"
            onClick={onSettingsClick}
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-zinc-500/10 transition-all duration-150 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
        ) : (
          <Link
            href="/settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-zinc-500/10 transition-all duration-150 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>
        )}
      </div>
    </header>
  );
}
