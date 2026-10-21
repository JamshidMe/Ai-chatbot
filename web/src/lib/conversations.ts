import type { ChatMeta } from '@shared/types';

export type MessageRole = 'user' | 'assistant';

export interface UiMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Provider that produced an assistant message ('deepseek' | 'mock'). */
  provider?: string;
  isMock?: boolean;
  meta?: ChatMeta;
  /** Epoch ms, used for the message timestamp. */
  createdAt?: number;
}

export interface Conversation {
  id: string;
  /** Derived from the first user message. */
  title: string;
  messages: UiMessage[];
  createdAt: number;
  updatedAt: number;
}

export const CONVERSATIONS_KEY = 'ai-chatbot.conversations.v1';
export const ACTIVE_CONVERSATION_KEY = 'ai-chatbot.active.v1';
export const SIDEBAR_COLLAPSED_KEY = 'ai-chatbot.sidebarCollapsed.v1';

const LIMITS = {
  maxConversations: 40,
  maxMessagesPerConversation: 200,
  titleLength: 48,
} as const;

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return '';
  if (clean.length <= LIMITS.titleLength) return clean;
  return `${clean.slice(0, LIMITS.titleLength - 1).trimEnd()}…`;
}

function isUiMessage(value: unknown): value is UiMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  );
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isUiMessage)
  );
}

export function createConversationWith(firstMessage: UiMessage): Conversation {
  const now = Date.now();
  return {
    id: createId(),
    title: deriveTitle(firstMessage.content),
    messages: [firstMessage],
    createdAt: now,
    updatedAt: now,
  };
}

export interface PersistedConversations {
  conversations: Conversation[];
  activeId: string | null;
}

/**
 * Reads conversations saved in this browser. Corrupt or foreign data is
 * discarded rather than thrown, so a broken entry can never blank the app.
 */
export function loadConversations(): PersistedConversations {
  if (typeof window === 'undefined') return { conversations: [], activeId: null };

  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return { conversations: [], activeId: null };

    const parsed: unknown = JSON.parse(raw);
    const conversations = Array.isArray(parsed) ? parsed.filter(isConversation) : [];
    if (conversations.length === 0) return { conversations: [], activeId: null };

    const storedActive = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
    const activeId = conversations.some((item) => item.id === storedActive)
      ? storedActive
      : (conversations[0]?.id ?? null);

    return { conversations, activeId };
  } catch {
    return { conversations: [], activeId: null };
  }
}

/** Best-effort persistence: a full or blocked store must not break chat. */
export function saveConversations(conversations: Conversation[], activeId: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    const trimmed = conversations.slice(0, LIMITS.maxConversations).map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-LIMITS.maxMessagesPerConversation),
    }));
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
    if (activeId === null) {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
    }
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
  }
}

export function loadSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Ignore: purely cosmetic preference.
  }
}
