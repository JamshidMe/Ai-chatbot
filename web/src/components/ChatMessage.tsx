import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from 'react';

import { useLang, useT } from '../i18n/useLang';
import { copyToClipboard } from '../lib/clipboard';
import type { UiMessage } from '../lib/conversations';
import { formatTime } from '../lib/time';
import { CheckIcon, CopyIcon, SparkIcon } from './Icons';

/**
 * The markdown pipeline (remark + highlight.js) is the heaviest dependency in
 * the app, so it is loaded on demand instead of blocking first paint.
 */
const Markdown = lazy(() => import('./Markdown'));

interface ChatMessageProps {
  message: UiMessage;
  /** Animates the message in when it was appended during this session. */
  isNew?: boolean;
}

/** Memoized: transcript re-renders must not re-render every past message. */
export const ChatMessage = memo(function ChatMessage({ message, isNew = false }: ChatMessageProps) {
  const t = useT();
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = useCallback(async () => {
    const succeeded = await copyToClipboard(message.content);
    if (!succeeded) return;
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1800);
  }, [message.content]);

  const time = formatTime(message.createdAt, lang);

  if (message.role === 'user') {
    return (
      <article className={isNew ? 'msg msg-user is-new' : 'msg msg-user'}>
        <div className="msg-user-stack">
          <p className="msg-bubble">{message.content}</p>
          {time ? (
            <time className="msg-time" dateTime={new Date(message.createdAt ?? 0).toISOString()}>
              {time}
            </time>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className={isNew ? 'msg msg-assistant is-new' : 'msg msg-assistant'}>
      <div className="msg-avatar" aria-hidden="true">
        <SparkIcon size={14} />
      </div>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-author">{t('chat.assistant')}</span>
          {message.isMock ? <span className="chip chip-mock">{t('mock.badge')}</span> : null}
          {time ? (
            <time className="msg-time" dateTime={new Date(message.createdAt ?? 0).toISOString()}>
              {time}
            </time>
          ) : null}
        </div>
        <div className="msg-content">
          <Suspense fallback={<p className="markdown-fallback">{message.content}</p>}>
            <Markdown content={message.content} />
          </Suspense>
        </div>
        <div className="msg-actions">
          <button
            type="button"
            className={copied ? 'action-button is-done' : 'action-button'}
            onClick={() => void onCopy()}
            aria-label={copied ? t('message.copied') : t('message.copy')}
          >
            {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            <span>{copied ? t('message.copied') : t('message.copy')}</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? t('message.copied') : ''}
          </span>
        </div>
      </div>
    </article>
  );
});
