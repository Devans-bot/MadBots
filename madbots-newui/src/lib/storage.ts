import type { BotAgent, ChatMessage } from '../types';

const STORAGE_KEYS = {
  theme: 'madbots_theme_v2',
  bots: 'madbots_bots_v2',
  conversations: 'madbots_conversations_v2',
} as const;

export function loadStoredTheme(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
  } catch {
    // Ignore storage access errors in restricted iframes
  }
  return false;
}

export function saveStoredTheme(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  } catch {
    // Ignore storage write errors
  }
}

export function loadStoredBots(fallback: BotAgent[]): BotAgent[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.bots);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as BotAgent[];
    }
  } catch {
    // Fallback to seed bots
  }
  return fallback;
}

export function saveStoredBots(bots: BotAgent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.bots, JSON.stringify(bots));
  } catch {
    // Ignore storage write errors
  }
}

export function loadStoredConversations(
  fallback: Record<string, ChatMessage[]>,
): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.conversations);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...(parsed as Record<string, ChatMessage[]>) };
    }
  } catch {
    // Fallback to seed conversations
  }
  return fallback;
}

export function saveStoredConversations(
  conversations: Record<string, ChatMessage[]>,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.conversations,
      JSON.stringify(conversations),
    );
  } catch {
    // Ignore storage write errors
  }
}
