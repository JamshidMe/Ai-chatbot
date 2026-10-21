import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeLang } from '@shared/lang';

import { setWidgetContext } from '../api';
import { Composer } from '../components/Composer';
import { LangSwitcher } from '../components/LangSwitcher';
import { MessageList } from '../components/MessageList';
import { SparkIcon } from '../components/Icons';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useChat } from '../hooks/useChat';
import { useLang, useT } from '../i18n/useLang';
import { companyInitials } from '../lib/time';
import { isEmbedded, postToParent, useParentMessages, type BridgeInbound } from './bridge';
import { useWidgetConfig } from './useWidgetConfig';

const FALLBACK_LIMITS = { maxMessageChars: 2000, maxHistoryMessages: 20 };

const ArrowIcon = () => (
  <svg
    className="embed-suggestion-arrow"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * The embeddable chat surface served at /embed.
 *
 * Rendered inside an iframe by the public widget loader, so its CSS can never
 * leak into the host page and the host's CSS cannot break it.
 */
export function EmbedApp() {
  const t = useT();
  const { lang, setLang } = useLang();
  const { config } = useWidgetConfig(lang);
  const embedded = isEmbedded();

  const {
    activeId,
    messages,
    status,
    pendingConversationId,
    error,
    send,
    retry,
    canRetry,
    startNewChat,
  } = useChat();

  const [confirmClear, setConfirmClear] = useState(false);
  const readySent = useRef(false);

  const limits = config?.limits ?? FALLBACK_LIMITS;
  const sending = status === 'sending';
  const isPendingActive = sending && pendingConversationId === activeId;
  const hasMessages = messages.length > 0;

  const { scrollRef, handleScroll } = useAutoScroll([messages.length, isPendingActive, error, activeId]);

  // Publish the public widget id once so requests carry X-Widget-Id.
  useEffect(() => {
    if (config) setWidgetContext({ widgetId: config.widgetId });
  }, [config]);

  // Accent colour is scoped to the embed shell; the rest of the theme is fixed.
  useEffect(() => {
    if (config?.accentColor) {
      document.documentElement.style.setProperty('--embed-accent', config.accentColor);
    }
  }, [config?.accentColor]);

  useEffect(() => {
    if (readySent.current) return;
    readySent.current = true;
    postToParent({ type: 'chatbot:ready' });
  }, []);

  const onParentMessage = useCallback(
    (message: BridgeInbound) => {
      if (message.type === 'chatbot:set-lang') {
        const next = normalizeLang(message.lang);
        if (next) setLang(next);
      }
    },
    [setLang],
  );
  useParentMessages(onParentMessage);

  const close = useCallback(() => postToParent({ type: 'chatbot:close' }), []);

  const suggestions = useMemo(
    () => [t('suggestions.s1'), t('suggestions.s2'), t('suggestions.s3')],
    [t],
  );

  const company = config?.companyName ?? t('app.title');
  const initials = companyInitials(company) || 'AI';
  const greeting = config?.greeting && config.greeting.length > 0 ? config.greeting : t('welcome.body');

  const askSuggestion = useCallback(
    (prompt: string) => {
      if (sending) return;
      void send(prompt);
    },
    [send, sending],
  );

  return (
    <div className="embed-shell">
      <header className="embed-header">
        <div className="embed-identity">
          <span className="embed-monogram" aria-hidden="true">
            <span className="embed-monogram-inner">{initials}</span>
          </span>
          <span className="embed-identity-text">
            <span className="embed-company">{company}</span>
            <span className="embed-status">
              <span className="embed-status-dot" aria-hidden="true" />
              <span className="embed-status-text">{t('health.ok')}</span>
              <span className="embed-status-sep" aria-hidden="true" />
              <span className="embed-status-role">{t('chat.assistant')}</span>
            </span>
          </span>
        </div>

        <div className="embed-actions">
          {hasMessages ? (
            confirmClear ? (
              <>
                <button
                  type="button"
                  className="embed-button embed-button-danger"
                  onClick={() => {
                    startNewChat();
                    setConfirmClear(false);
                  }}
                >
                  {t('chat.clear')}
                </button>
                <button type="button" className="embed-button" onClick={() => setConfirmClear(false)}>
                  {t('nav.deleteNo')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="embed-icon-button"
                onClick={() => setConfirmClear(true)}
                aria-label={t('chat.clear')}
                title={t('chat.clear')}
              >
                <TrashIcon />
              </button>
            )
          ) : null}

          {embedded ? (
            <button
              type="button"
              className="embed-icon-button"
              onClick={close}
              aria-label={t('nav.closeMenu')}
              title={t('nav.closeMenu')}
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>
      </header>

      {config?.demoData ? (
        <p className="embed-notice" role="note">
          {t('assistant.demoNotice')}
        </p>
      ) : null}

      <div className="embed-transcript" ref={scrollRef} onScroll={handleScroll}>
        {hasMessages ? (
          <MessageList
            conversationId={activeId ?? 'draft'}
            messages={messages}
            isPending={isPendingActive}
            error={error}
            canRetry={canRetry && !sending}
            onRetry={retry}
          />
        ) : (
          <div className="embed-welcome">
            <span className="embed-hero-mark" aria-hidden="true">
              <SparkIcon size={21} />
            </span>
            <p className="embed-eyebrow">{t('chat.assistant')}</p>
            <h1 className="embed-hero-title">{company}</h1>
            <p className="embed-hero-body">{greeting}</p>

            <div className="embed-suggest">
              <p className="embed-suggest-label">{t('suggestions.label')}</p>
              <ul className="embed-suggestions">
                {suggestions.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      className="embed-suggestion"
                      onClick={() => askSuggestion(prompt)}
                      disabled={sending}
                    >
                      <span className="embed-suggestion-icon" aria-hidden="true">
                        <SparkIcon size={13} />
                      </span>
                      <span className="embed-suggestion-text">{prompt}</span>
                      <ArrowIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="embed-footer">
        <Composer onSend={send} sending={sending} maxMessageChars={limits.maxMessageChars} />
        <div className="embed-footer-meta">
          <span className="embed-footnote">{t('assistant.groundedNotice')}</span>
          <LangSwitcher />
        </div>
      </div>
    </div>
  );
}
