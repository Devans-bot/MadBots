import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { INITIAL_BOTS } from '../data/bots';
import { INITIAL_CONVERSATIONS } from '../data/conversations';
import {
  clampThinkingLevel,
  createCustomBot,
  formatClockTime,
  generateBotReply,
  getThinkingLevelMeta,
  type CreateBotInput,
} from '../lib/botEngine';
import { parseRoute, routeToPath } from '../lib/router';
import {
  loadStoredBots,
  loadStoredConversations,
  loadStoredTheme,
  saveStoredBots,
  saveStoredConversations,
  saveStoredTheme,
} from '../lib/storage';
import type {
  AppRoute,
  BotAgent,
  ChatMessage,
  MessageAttachment,
  ThinkingLevel,
  ToastItem,
} from '../types';

interface AppContextValue {
  route: AppRoute;
  navigate: (next: AppRoute) => void;
  isDarkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  bots: BotAgent[];
  activeBotId: string;
  conversations: Record<string, ChatMessage[]>;
  typingBotId: string | null;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  pushToast: (message: string, tone?: ToastItem['tone']) => void;
  openBotChat: (botId: string) => void;
  sendMessage: (
    botId: string,
    text: string,
    attachments?: MessageAttachment[],
  ) => void;
  markDiffApplied: (botId: string, messageId: string) => void;
  clearConversation: (botId: string) => void;
  updateBotThinkingLevel: (botId: string, level: ThinkingLevel) => void;
  savePreferences: (
    nextDarkMode: boolean,
    levelsByBotId: Record<string, ThinkingLevel>,
  ) => void;
  addCustomBot: (input: CreateBotInput) => BotAgent;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [bots, setBots] = useState<BotAgent[]>(() =>
    loadStoredBots(INITIAL_BOTS),
  );
  const [conversations, setConversations] = useState<
    Record<string, ChatMessage[]>
  >(() => loadStoredConversations(INITIAL_CONVERSATIONS));
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() =>
    loadStoredTheme(),
  );
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined'
      ? parseRoute(window.location.pathname, INITIAL_BOTS[0].id)
      : { name: 'home' },
  );
  const [activeBotId, setActiveBotId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parsed = parseRoute(window.location.pathname, INITIAL_BOTS[0].id);
      if (parsed.name === 'chat') return parsed.botId;
    }
    return INITIAL_BOTS[0].id;
  });
  const [typingBotId, setTypingBotId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const replyTimerRef = useRef<number | null>(null);

  // Sync Tailwind v4 dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveStoredTheme(isDarkMode);
  }, [isDarkMode]);

  // Persist bots & conversations
  useEffect(() => {
    saveStoredBots(bots);
  }, [bots]);

  useEffect(() => {
    saveStoredConversations(conversations);
  }, [conversations]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRoute(
        window.location.pathname,
        bots[0]?.id ?? INITIAL_BOTS[0].id,
      );
      setRoute(parsed);
      if (parsed.name === 'chat') {
        setActiveBotId(parsed.botId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [bots]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'neutral') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    },
    [],
  );

  const navigate = useCallback((next: AppRoute) => {
    setRoute(next);
    if (next.name === 'chat') {
      setActiveBotId(next.botId);
    }
    const targetPath = routeToPath(next);
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== targetPath
    ) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const openBotChat = useCallback(
    (botId: string) => {
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === botId ? { ...bot, unreadCount: 0 } : bot,
        ),
      );
      navigate({ name: 'chat', botId });
    },
    [navigate],
  );

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDarkModeState(dark);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    (
      botId: string,
      text: string,
      attachments: MessageAttachment[] = [],
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const targetBot = bots.find((b) => b.id === botId) ?? bots[0];
      if (!targetBot) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        type: 'user',
        text: trimmed,
        timestamp: formatClockTime(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      setConversations((prev) => ({
        ...prev,
        [botId]: [...(prev[botId] ?? []), userMsg],
      }));

      setTypingBotId(botId);
      const meta = getThinkingLevelMeta(
        targetBot.category,
        targetBot.thinkingLevel,
      );

      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }

      replyTimerRef.current = window.setTimeout(() => {
        const reply = generateBotReply(targetBot, trimmed, attachments);
        setConversations((prev) => ({
          ...prev,
          [botId]: [...(prev[botId] ?? []), reply],
        }));

        const previewSummary =
          reply.type === 'bot_code'
            ? reply.summary
            : reply.type === 'bot_note'
              ? reply.text
              : reply.type === 'bot_bullets'
                ? reply.intro
                : reply.type === 'bot_gallery'
                  ? reply.intro
                  : trimmed;

        setBots((prev) =>
          prev.map((bot) =>
            bot.id === botId
              ? {
                  ...bot,
                  lastUpdated: 'Just now',
                  lastMessage: previewSummary,
                  latencyMs: meta.estimatedLatencyMs,
                }
              : bot,
          ),
        );
        setTypingBotId(null);
      }, meta.responseDelayMs);
    },
    [bots],
  );

  const markDiffApplied = useCallback(
    (botId: string, messageId: string) => {
      setConversations((prev) => {
        const list = prev[botId] ?? [];
        return {
          ...prev,
          [botId]: list.map((msg) => {
            if (msg.id === messageId && msg.type === 'bot_code') {
              return {
                ...msg,
                codeBlock: {
                  ...msg.codeBlock,
                  diffApplied: true,
                },
              };
            }
            return msg;
          }),
        };
      });
      pushToast('Diff applied to active workspace buffer.', 'success');
    },
    [pushToast],
  );

  const clearConversation = useCallback(
    (botId: string) => {
      const targetBot = bots.find((b) => b.id === botId);
      setConversations((prev) => ({
        ...prev,
        [botId]: [
          {
            id: `div-${Date.now()}`,
            type: 'divider',
            text: `New session, ${formatClockTime()}`,
          },
          {
            id: `welcome-${Date.now()}`,
            type: 'bot_note',
            text: `Fresh workspace buffer initialized for ${targetBot?.name ?? 'Agent'}. Send a prompt or tap a quick suggestion below.`,
            noteTitle: 'Session Ready:',
            noteDesc: `Context cleared cleanly. Active model: ${targetBot?.model ?? 'GPT-4o'}.`,
            timestamp: formatClockTime(),
          },
        ],
      }));
      pushToast('Started a fresh thread.', 'info');
    },
    [bots, pushToast],
  );

  const updateBotThinkingLevel = useCallback(
    (botId: string, level: ThinkingLevel) => {
      const safeLevel = clampThinkingLevel(level);
      setBots((prev) =>
        prev.map((bot) => {
          if (bot.id !== botId) return bot;
          const meta = getThinkingLevelMeta(bot.category, safeLevel);
          return {
            ...bot,
            thinkingLevel: safeLevel,
            latencyMs: meta.estimatedLatencyMs,
          };
        }),
      );
    },
    [],
  );

  const savePreferences = useCallback(
    (
      nextDarkMode: boolean,
      levelsByBotId: Record<string, ThinkingLevel>,
    ) => {
      setIsDarkModeState(nextDarkMode);
      setBots((prev) =>
        prev.map((bot) => {
          const nextLevel = levelsByBotId[bot.id];
          if (nextLevel === undefined) return bot;
          const safe = clampThinkingLevel(nextLevel);
          const meta = getThinkingLevelMeta(bot.category, safe);
          return {
            ...bot,
            thinkingLevel: safe,
            latencyMs: meta.estimatedLatencyMs,
          };
        }),
      );
      pushToast('Configuration preferences saved.', 'success');
    },
    [pushToast],
  );

  const addCustomBot = useCallback(
    (input: CreateBotInput): BotAgent => {
      const newBot = createCustomBot(input);
      setBots((prev) => [newBot, ...prev]);
      setConversations((prev) => ({
        ...prev,
        [newBot.id]: [
          {
            id: `div-${newBot.id}`,
            type: 'divider',
            text: `Today, ${formatClockTime()}`,
          },
          {
            id: `init-${newBot.id}`,
            type: 'bot_note',
            text: `${newBot.name} (${newBot.model}) is online and configured for ${newBot.role.toLowerCase()}.`,
            noteTitle: 'Prototype Ready:',
            noteDesc:
              'Adjust thinking depth anytime in Settings or pick a quick prompt below to start iterating.',
            timestamp: formatClockTime(),
          },
        ],
      }));
      pushToast(`Created ${newBot.name}.`, 'success');
      return newBot;
    },
    [pushToast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      route,
      navigate,
      isDarkMode,
      setDarkMode,
      toggleDarkMode,
      bots,
      activeBotId,
      conversations,
      typingBotId,
      toasts,
      dismissToast,
      pushToast,
      openBotChat,
      sendMessage,
      markDiffApplied,
      clearConversation,
      updateBotThinkingLevel,
      savePreferences,
      addCustomBot,
    }),
    [
      route,
      navigate,
      isDarkMode,
      setDarkMode,
      toggleDarkMode,
      bots,
      activeBotId,
      conversations,
      typingBotId,
      toasts,
      dismissToast,
      pushToast,
      openBotChat,
      sendMessage,
      markDiffApplied,
      clearConversation,
      updateBotThinkingLevel,
      savePreferences,
      addCustomBot,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
