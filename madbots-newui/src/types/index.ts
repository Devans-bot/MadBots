export type BotThemeAccent = 'blue' | 'pink';

export type ThinkingLevel = 0 | 1 | 2 | 3;

export type BotCategory = 'engineering' | 'creative';

export interface BotAgent {
  id: string;
  name: string;
  settingsName?: string;
  shortInitial: string;
  model: string;
  role: string;
  tierLabel: string;
  category: BotCategory;
  accent: BotThemeAccent;
  status: 'online' | 'idle';
  lastUpdated: string;
  lastMessage: string;
  capabilityLabel: string;
  capabilityIcon: 'code' | 'image' | 'sparkles';
  latencyMs: number;
  showLatency?: boolean;
  unreadCount: number;
  thinkingLevel: ThinkingLevel;
  quickPrompts: string[];
  avatarVariant: 'nexus' | 'aura' | 'custom';
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: string;
  kind: 'code' | 'design' | 'doc';
}

export interface CodeBlockPayload {
  filename: string;
  language: string;
  code: string;
  diffBefore?: string;
  diffApplied?: boolean;
}

export interface BulletPoint {
  title: string;
  desc: string;
}

export interface PreviewSwatch {
  title: string;
  palette: string[];
  ratio: string;
  note: string;
}

export type ChatMessage =
  | {
      id: string;
      type: 'divider';
      text: string;
    }
  | {
      id: string;
      type: 'user';
      text: string;
      timestamp: string;
      attachments?: MessageAttachment[];
    }
  | {
      id: string;
      type: 'bot_code';
      summary: string;
      highlights?: { phrase: string; tone: 'blue' | 'pink' }[];
      codeBlock: CodeBlockPayload;
      timestamp: string;
    }
  | {
      id: string;
      type: 'bot_note';
      text: string;
      noteTitle: string;
      noteDesc: string;
      timestamp: string;
    }
  | {
      id: string;
      type: 'bot_bullets';
      intro: string;
      points: BulletPoint[];
      timestamp: string;
    }
  | {
      id: string;
      type: 'bot_gallery';
      intro: string;
      previews: PreviewSwatch[];
      timestamp: string;
    };

export interface ToastItem {
  id: string;
  message: string;
  tone: 'neutral' | 'success' | 'info';
}

export type AppRoute =
  | { name: 'home' }
  | { name: 'chat'; botId: string }
  | { name: 'settings' };
