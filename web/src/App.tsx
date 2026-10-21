import { useCallback, useEffect, useRef, useState } from 'react';

import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useAutoScroll } from './hooks/useAutoScroll';
import { useChat } from './hooks/useChat';
import { useHealth } from './hooks/useHealth';
import { useLang, useT } from './i18n/useLang';
import { loadSidebarCollapsed, saveSidebarCollapsed } from './lib/conversations';

const FALLBACK_LIMITS = { maxMessageChars: 2000, maxHistoryMessages: 20 };

export function App() {
  const t = useT();
  const { lang } = useLang();
  const { health, offline } = useHealth(lang);

  const {
    conversations,
    activeId,
    activeTitle,
    messages,
    status,
    pendingConversationId,
    error,
    send,
    retry,
    canRetry,
    startNewChat,
    selectConversation,
    deleteConversation,
  } = useChat();

  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasOpenedDrawer = useRef(false);

  const limits = health?.limits ?? FALLBACK_LIMITS;
  const sending = status === 'sending';
  const hasMessages = messages.length > 0;
  // The indicator belongs to the conversation awaiting a reply, not whichever
  // conversation happens to be open.
  const isPendingActive = sending && pendingConversationId === activeId;

  const { scrollRef, handleScroll } = useAutoScroll([messages.length, isPendingActive, error, activeId]);

  useEffect(() => {
    saveSidebarCollapsed(collapsed);
  }, [collapsed]);

  // Warm the lazily-loaded markdown chunk after first paint so the first reply
  // renders formatted immediately, without delaying the initial load.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('./components/Markdown');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // Mobile drawer: Escape closes it, focus moves in on open and returns on close.
  useEffect(() => {
    if (!drawerOpen) return;

    hasOpenedDrawer.current = true;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen || !hasOpenedDrawer.current) return;
    menuButtonRef.current?.focus();
  }, [drawerOpen]);

  const handleNewChat = useCallback(() => {
    startNewChat();
    setDrawerOpen(false);
  }, [startNewChat]);

  const handleSelect = useCallback(
    (id: string) => {
      selectConversation(id);
      setDrawerOpen(false);
    },
    [selectConversation],
  );

  const handleSend = useCallback(
    (text: string) => {
      send(text);
    },
    [send],
  );

  return (
    <div
      className={[
        'app-shell',
        collapsed ? 'is-collapsed' : '',
        drawerOpen ? 'is-drawer-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        health={health}
        offline={offline}
        closeButtonRef={closeButtonRef}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onDelete={deleteConversation}
        onToggleCollapsed={() => setCollapsed((previous) => !previous)}
        onCloseMobile={() => setDrawerOpen(false)}
      />

      <div
        className="scrim"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        role="presentation"
      />

      <main className="workspace" inert={drawerOpen}>
        <TopBar
          title={activeTitle ?? t('app.title')}
          health={health}
          offline={offline}
          menuButtonRef={menuButtonRef}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <div className="transcript" ref={scrollRef} onScroll={handleScroll}>
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
            <WelcomeScreen onPickSuggestion={handleSend} disabled={sending} />
          )}
        </div>

        <div className="composer-dock">
          <Composer onSend={handleSend} sending={sending} maxMessageChars={limits.maxMessageChars} />
        </div>
      </main>
    </div>
  );
}
