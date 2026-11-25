import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useDragControls,
  type PanInfo,
} from 'motion/react';
import { BotAvatar } from '../components/BotAvatar';
import { ChatComposer } from '../components/ChatComposer';
import { ChatSkeletonList } from '../components/ChatSkeletonList';
import { DiffPreviewModal } from '../components/DiffPreviewModal';
import { MessageBubble } from '../components/MessageBubble';
import { useApp } from '../context/AppContext';
import {
  CHAT_LOAD_DURATION_MS,
  getThinkingLevelMeta,
  shouldDismissSheet,
} from '../lib/botEngine';
import type { CodeBlockPayload } from '../types';

interface ChatViewProps {
  botId: string;
}

export function ChatView({ botId }: ChatViewProps) {
  const {
    bots,
    conversations,
    typingBotId,
    navigate,
    openBotChat,
    sendMessage,
    markDiffApplied,
    pushToast,
  } = useApp();

  const bot = useMemo(
    () => bots.find((item) => item.id === botId) ?? bots[0],
    [bots, botId],
  );

  const messages = useMemo(
    () => conversations[bot.id] ?? [],
    [conversations, bot.id],
  );

  const isTyping = typingBotId === bot.id;
  const thinkingMeta = getThinkingLevelMeta(bot.category, bot.thinkingLevel);

  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [diffTarget, setDiffTarget] = useState<{
    messageId: string;
    codeBlock: CodeBlockPayload;
  } | null>(null);

  const dragControls = useDragControls();
  const didDragRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const initialCountRef = useRef<number>(messages.length);
  const prevBotIdRef = useRef<string>(bot.id);

  // Show Bot Header immediately + skeleton messages for 3s on chat open / bot switch
  useEffect(() => {
    setIsLoadingMessages(true);
    initialCountRef.current = messages.length;
    prevBotIdRef.current = bot.id;
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });

    const timer = window.setTimeout(() => {
      setIsLoadingMessages(false);
    }, CHAT_LOAD_DURATION_MS);

    return () => window.clearTimeout(timer);
    // Intentionally trigger only when opening a chat or switching bots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot.id]);

  // Auto-scroll smoothly whenever a new message arrives after loading finishes
  useEffect(() => {
    if (isLoadingMessages) return;
    if (messages.length > initialCountRef.current || isTyping) {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages.length, isTyping, isLoadingMessages]);

  const handleCloseToHome = () => {
    navigate({ name: 'home' });
  };

  const handleBarClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    handleCloseToHome();
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (shouldDismissSheet(info.offset.y, info.velocity.y)) {
      handleCloseToHome();
    }
  };

  return (
    <motion.div
      data-testid="chat-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.55 }}
      onDragStart={() => {
        didDragRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-[45px] bottom-0 z-30 flex flex-col lg:bg-[#f4f5f7] lg:dark:bg-[#0f1115] bg-transparent overflow-visible select-none shadow-none"
    >
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex gap-5 lg:px-6 overflow-visible relative">
        {/* Desktop Sidebar Bot Switcher */}
        <aside
          aria-label="Switch active bot"
          className="hidden lg:flex flex-col w-68 shrink-0 pb-5 pt-3 gap-2.5 overflow-y-auto no-scrollbar"
        >
          <div className="px-2 pt-1 pb-1 text-[11px] font-bold tracking-wide text-zinc-500 dark:text-zinc-400">
            Workspace Bots
          </div>
          {bots.map((item) => {
            const active = item.id === bot.id;
            const meta = getThinkingLevelMeta(item.category, item.thinkingLevel);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openBotChat(item.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                  active
                    ? 'bg-white text-zinc-950 border-zinc-300 dark:bg-[#232832] dark:text-white dark:border-zinc-700'
                    : 'bg-white/80 hover:bg-white text-zinc-700 border-zinc-200/80 dark:bg-[#191d24]/80 dark:hover:bg-[#1f242d] dark:text-zinc-300 dark:border-zinc-800'
                }`}
              >
                <BotAvatar bot={item} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-bold truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                      {item.model}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {meta.shortName} · {item.latencyMs}ms
                  </p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Primary Graph-Paper Chat Sheet with Neon Gradient Top Border + Subtle Glow */}
        <div
          data-testid="chat-sheet-frame"
          className="flex-1 min-w-0 flex flex-col rounded-t-[26px] pt-[2px] px-[1.5px] pb-0 madbots-chat-neon-frame"
        >
          <section
            aria-label={`Chat with ${bot.name}`}
            className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden rounded-t-[24.5px] bg-white dark:bg-[#14171c] madbots-graph-grid"
          >
          {/* Top Draggable Handle + Floating Bot Header */}
          <div
            onPointerDown={(e) => {
              didDragRef.current = false;
              dragControls.start(e);
            }}
            className="shrink-0 z-20 pt-1 pb-2.5 touch-none"
          >
            {/* iOS-style centered horizontal swipe bar (click OR swipe down to return Home) */}
            <div className="flex justify-center">
              <button
                type="button"
                data-testid="ios-swipe-bar"
                aria-label="Swipe down or click to close chat"
                onClick={handleBarClick}
                className="group w-36 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-[#0066ff] rounded-full"
              >
                <span className="w-14 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-400 transition-colors" />
              </button>
            </div>

            {/* Bot Header (loads immediately while messages skeleton for 3s) */}
            <div className="w-[95%] mx-auto flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white/95 dark:bg-[#191d24]/95 backdrop-blur-md border border-[#e6e7ec] dark:border-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 min-w-0">
                <BotAvatar bot={bot} size="sm" showStatus paletteTone="ink" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[15.5px] text-[#1a1c1c] dark:text-zinc-50 leading-tight tracking-tight truncate">
                    {bot.name}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                    {isLoadingMessages
                      ? 'Syncing thread...'
                      : `${bot.model} · ${thinkingMeta.shortName} thinking`}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 hidden sm:inline shrink-0">
                Swipe bar to close
              </span>
            </div>
          </div>

          {/* Dedicated Scrollable Message Viewport */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 w-full pt-2 pb-40 overflow-y-auto select-text"
          >
            {isLoadingMessages ? (
              <ChatSkeletonList key="skeleton" />
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0.01 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-3.5 w-full pb-8"
              >
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    bot={bot}
                    onRequestDiff={(messageId, codeBlock) =>
                      setDiffTarget({ messageId, codeBlock })
                    }
                    onCodeCopied={() =>
                      pushToast('Code copied to clipboard.', 'info')
                    }
                  />
                ))}

                {/* Typing / Thinking Indicator (Discord-style 95% faded blue box) */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-[95%] mx-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#ebf3ff] dark:bg-[#17243a] border border-[#d2e3ff] dark:border-[#243b61]"
                  >
                    <span
                      className="flex items-center gap-1"
                      aria-hidden="true"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] animate-bounce [animation-delay:240ms]" />
                    </span>
                    <span className="text-[12.5px] font-medium text-[#2c4b7c] dark:text-zinc-300">
                      {bot.name} is thinking ({thinkingMeta.shortName})...
                    </span>
                  </motion.div>
                )}

                <div ref={bottomAnchorRef} />
              </motion.div>
            )}
          </div>

          {/* Docked Bottom Interaction Unit */}
          <div className="absolute bottom-0 left-0 right-0 z-30">
            <ChatComposer
              bot={bot}
              disabled={isTyping || isLoadingMessages}
              onSend={(text, attachments) =>
                sendMessage(bot.id, text, attachments)
              }
            />
          </div>
          </section>
        </div>
      </div>

      <DiffPreviewModal
        open={Boolean(diffTarget)}
        codeBlock={diffTarget?.codeBlock ?? null}
        onClose={() => setDiffTarget(null)}
        onConfirmApply={() => {
          if (diffTarget) {
            markDiffApplied(bot.id, diffTarget.messageId);
          }
          setDiffTarget(null);
        }}
      />
    </motion.div>
  );
}
