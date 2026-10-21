import { useEffect, useMemo, useRef } from 'react';

import { useT } from '../i18n/useLang';
import type { UiMessage } from '../lib/conversations';
import { AlertIcon } from './Icons';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  conversationId: string;
  messages: UiMessage[];
  /** True only when *this* conversation is awaiting a reply. */
  isPending: boolean;
  error: string | null;
  canRetry: boolean;
  onRetry: () => void;
}

export function MessageList({
  conversationId,
  messages,
  isPending,
  error,
  canRetry,
  onRetry,
}: MessageListProps) {
  const t = useT();

  /**
   * Entrance animation bookkeeping.
   *
   * Only messages appended *after* a conversation has been rendered get
   * `is-new`, so:
   *  - restored history does not replay its animation on load;
   *  - switching conversations does not re-animate the transcript;
   *  - re-renders never restart an animation.
   *
   * The "seen" snapshot is updated in an effect (after commit) rather than
   * during render, so React's StrictMode double-render stays idempotent and the
   * animation is not silently swallowed in development.
   */
  const seen = useRef<{ conversationId: string | null; ids: Set<string> }>({
    conversationId: null,
    ids: new Set(),
  });

  const newIds = useMemo(() => {
    const result = new Set<string>();
    if (seen.current.conversationId === conversationId) {
      for (const message of messages) {
        if (!seen.current.ids.has(message.id)) result.add(message.id);
      }
    }
    return result;
  }, [conversationId, messages]);

  useEffect(() => {
    seen.current = {
      conversationId,
      ids: new Set(messages.map((message) => message.id)),
    };
  }, [conversationId, messages]);

  return (
    <div className="messages-inner" aria-busy={isPending}>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} isNew={newIds.has(message.id)} />
      ))}

      {isPending ? <TypingIndicator /> : null}

      {error ? (
        <div className="error-notice" role="alert">
          <span className="error-icon" aria-hidden="true">
            <AlertIcon size={16} />
          </span>
          <p className="error-text">{error}</p>
          {canRetry ? (
            <button type="button" className="button" onClick={onRetry} disabled={isPending}>
              {t('message.retry')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
