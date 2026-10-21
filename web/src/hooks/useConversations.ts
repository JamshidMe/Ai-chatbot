import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createConversationWith,
  loadConversations,
  saveConversations,
  type Conversation,
  type UiMessage,
} from '../lib/conversations';

export interface ConversationsState {
  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  /** Starts an empty draft (welcome screen); no conversation row is created yet. */
  startNewChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  appendMessage: (conversationId: string, message: UiMessage) => void;
  /** Creates a conversation whose first message is already present. */
  createFromMessage: (firstMessage: UiMessage) => string;
}

/**
 * Session conversations with real localStorage persistence (this browser only —
 * nothing is sent to a server and nothing is shared across devices).
 */
export function useConversations(): ConversationsState {
  const [state, setState] = useState(loadConversations);
  useEffect(() => {
    saveConversations(state.conversations, state.activeId);
  }, [state]);

  const activeConversation = useMemo(
    () => state.conversations.find((conversation) => conversation.id === state.activeId) ?? null,
    [state],
  );

  const startNewChat = useCallback(() => {
    setState((previous) => ({ ...previous, activeId: null }));
  }, []);

  const selectConversation = useCallback((id: string) => {
    setState((previous) =>
      previous.conversations.some((conversation) => conversation.id === id)
        ? { ...previous, activeId: id }
        : previous,
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setState((previous) => {
      const conversations = previous.conversations.filter((conversation) => conversation.id !== id);
      const activeId = previous.activeId === id ? (conversations[0]?.id ?? null) : previous.activeId;
      return { conversations, activeId };
    });
  }, []);

  const appendMessage = useCallback((conversationId: string, message: UiMessage) => {
    setState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              updatedAt: Date.now(),
            }
          : conversation,
      ),
    }));
  }, []);

  const createFromMessage = useCallback((firstMessage: UiMessage): string => {
    const conversation = createConversationWith(firstMessage);
    setState((previous) => ({
      conversations: [conversation, ...previous.conversations],
      activeId: conversation.id,
    }));
    return conversation.id;
  }, []);

  return {
    conversations: state.conversations,
    activeId: state.activeId,
    activeConversation,
    startNewChat,
    selectConversation,
    deleteConversation,
    appendMessage,
    createFromMessage,
  };
}
