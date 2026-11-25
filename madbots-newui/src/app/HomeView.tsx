import { BackgroundDoodles } from '../components/BackgroundDoodles';
import { BotCard } from '../components/BotCard';
import { useApp } from '../context/AppContext';

export function HomeView() {
  const { bots, openBotChat } = useApp();

  return (
    <div className="h-full w-full overflow-y-auto relative bg-white dark:bg-[#141618] text-zinc-950 dark:text-zinc-100 transition-colors duration-200">
      <BackgroundDoodles />

      {/* Main Hero & AI Chatbots List */}
      <main className="relative z-10 w-full max-w-xl lg:max-w-5xl mx-auto pt-8 pb-16 flex flex-col px-4 sm:px-6">
        <div className="pb-5 text-left">
          <h1 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-1.5">
            <span>Talk.</span>
            <span>Think.</span>
            <span className="relative inline-block">
              Build.
              <svg
                aria-hidden="true"
                className="absolute left-0 -bottom-1.5 w-full h-2.5 text-[#FF2B85] fill-none overflow-visible stroke-current stroke-[2.5]"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
              >
                <path d="M2 8 C 20 2, 35 12, 50 6 C 65 1, 80 11, 98 5" />
              </svg>
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pb-safe">
          {bots.map((bot, idx) => (
            <BotCard
              key={bot.id}
              bot={bot}
              index={idx}
              onSelect={openBotChat}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
