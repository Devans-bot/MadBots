import { Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function MainHeader() {
  const { route, navigate } = useApp();
  const isChatOpen = route.name === 'chat';

  return (
    <header
      data-testid="main-header"
      className={`relative z-20 shrink-0 pt-safe bg-white dark:bg-[#191c21] transition-colors duration-200 ${
        isChatOpen
          ? 'rounded-b-none shadow-none border-b-0'
          : 'rounded-b-[22px] madbots-header-shadow border-b border-zinc-100 dark:border-zinc-800/80'
      }`}
    >
      {/* pt-3 (12px) + h-9 (36px) + pb-[15px] (15px) = 63px total; when chat opens, header row glides up 5px and chat overlays up to y=55px */}
      <div
        className={`pt-3 pb-[15px] px-6 max-w-xl lg:max-w-5xl mx-auto flex items-center justify-between transition-transform duration-200 ease-out ${
          isChatOpen ? '-translate-y-[5px]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => navigate({ name: 'home' })}
          aria-label="MaDbotS Home"
          className="h-9 flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0066ff] rounded"
        >
          <span className="font-black text-[19px] leading-none tracking-tighter text-zinc-950 dark:text-white">
            MaDbotS
            <span className="text-[#FF2B85] font-black">*</span>
          </span>
        </button>

        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate({ name: 'settings' })}
          className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 cursor-pointer active:scale-95"
        >
          <Settings className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
