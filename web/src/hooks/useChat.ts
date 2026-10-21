import type { ChatHistoryItem } from '@shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError, sendChatMessage } from '../api';
import { useLang, useT } from '../i18n/useLang';
import { createId, type UiMessage } from '../lib/conversations';

import { useConversations } from './useConversations';

const MAX_HISTORY_TURNS = 20;

export type ChatStatus = 'idle' | 'sending';

export interface ChatState {
  conversations: ReturnType<typeof useConversations>['conversations'];
  activeId: string | null;
  messages: UiMessage[];
  activeTitle: string | null;
  status: ChatStatus;
  /** Conversation actually awaiting a reply, so indicators never leak across chats. */
  pendingConversationId: string | null;
  error: string | null;
  send: (text: string) => void;
  retry: () => void;
  canRetry: boolean;
  startNewChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  dismissError: () => void;
}

/**
 * Owns the request lifecycle. The wire format is unchanged from the original
 * client: POST /api/chat with { message, lang, history }.
 *
 * Invariants:
 *  - at most one request in flight (guarded by a ref, not by state, so rapid
 *    double submits cannot slip through before React re-renders);
 *  - a failed request never removes or reorders existing messages; the user
 *    turn stays put and can be retried without duplicating it;
 *  - late responses after unmount are ignored.
 */
export function useChat(): ChatState {
  const { lang } = useLang();
  const t = useT();
  const {
    conversations,
    activeId,
    activeConversation,
    startNewChat,
    selectConversation,
    deleteConversation,
    appendMessage,
    createFromMessage,
  } = useConversations();

  const [status, setStatus] = useState<ChatStatus>('idle');
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const localizeError = useCallback(
    (cause: unknown): string => {
      if (cause instanceof ApiClientError) {
        switch (cause.code) {
          case 'network_error':
            return t('errors.networkError');
          case 'timeout':
            return t('errors.timeout');
          case 'malformed_response':
            return t('errors.malformedResponse');
          case 'provider_unavailable':
            return t('errors.providerUnavailable');
          case 'provider_failed':
            return t('errors.providerFailed');
          default:
            // Server messages (e.g. too_long) are already localized through
            // Accept-Language and carry the configured limits, so pass them through.
            return cause.message || t('errors.serverError');
        }
      }
      return t('errors.serverError');
    },
    [t],
  );

  const requestReply = useCallback(
    async (conversationId: string, text: string, priorMessages: UiMessage[]): Promise<void> => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus('sending');
      setPendingConversationId(conversationId);
      setError(null);

      // Only the most recent turns are sent; the server bounds this again.
      const history: ChatHistoryItem[] = priorMessages
        .slice(-MAX_HISTORY_TURNS)
        .map((message) => ({ role: message.role, content: message.content }));

      try {
        const response = await sendChatMessage(lang, { message: text, lang, history });
        if (!mounted.current) return;
        appendMessage(conversationId, {
          id: createId(),
          role: 'assistant',
          content: response.reply,
          createdAt: Date.now(),
          provider: response.provider,
          isMock: response.isMock,
          meta: response.meta,
        });
      } catch (cause) {
        if (!mounted.current) return;
        setError(localizeError(cause));
      } finally {
        inFlight.current = false;
        if (mounted.current) {
          setStatus('idle');
          setPendingConversationId(null);
        }
      }
    },
    [appendMessage, lang, localizeError],
  );

  const send = useCallback(
    (rawText: string): void => {
      const text = rawText.trim();
      if (text.length === 0 || inFlight.current) return;

      const userMessage: UiMessage = {
        id: createId(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };
      const priorMessages = activeConversation?.messages ?? [];
      const conversationId = activeConversation?.id ?? createFromMessage(userMessage);

      if (activeConversation) appendMessage(conversationId, userMessage);

      void requestReply(conversationId, text, priorMessages);
    },
    [activeConversation, appendMessage, createFromMessage, requestReply],
  );

  /** Re-sends the last user turn without duplicating it in the transcript. */
  const retry = useCallback((): void => {
    const conversation = activeConversation;
    if (!conversation || inFlight.current) return;

    const lastUserIndex = conversation.messages.reduce(
      (found, message, index) => (message.role === 'user' ? index : found),
      -1,
    );
    if (lastUserIndex < 0) return;

    const lastUser = conversation.messages[lastUserIndex];
    if (!lastUser) return;

    void requestReply(
      conversation.id,
      lastUser.content,
      conversation.messages.slice(0, lastUserIndex),
    );
  }, [activeConversation, requestReply]);

  const dismissError = useCallback(() => setError(null), []);

  const messages = activeConversation?.messages ?? [];
  const canRetry = messages.some((message) => message.role === 'user');

  return {
    conversations,
    activeId,
    messages,
    activeTitle: activeConversation?.title ?? null,
    status,
    pendingConversationId,
    error,
    send,
    retry,
    canRetry,
    startNewChat,
    selectConversation,
    deleteConversation,
    dismissError,
  };
}
