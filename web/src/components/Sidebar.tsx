import { useState, type RefObject } from 'react';
import type { HealthResponse } from '@shared/types';

import { useT } from '../i18n/useLang';
import type { Conversation } from '../lib/conversations';
import { ChatIcon, CloseIcon, LogoMark, PanelIcon, PlusIcon, TrashIcon } from './Icons';
import { LangSwitcher } from './LangSwitcher';
import { ProviderBadge } from './ProviderBadge';

interface ConversationRowProps {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationRow({ conversation, active, onSelect, onDelete }: ConversationRowProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <li className="conv-row is-confirming">
        <div className="conv-confirm" role="group" aria-label={t('nav.deleteConfirm')}>
          <span className="conv-confirm-text">{t('nav.deleteConfirm')}</span>
          <div className="conv-confirm-actions">
            {/* Focus lands on the destructive action so keyboard users can confirm or escape. */}
            <button
              type="button"
              autoFocus
              className="button button-danger"
              onClick={() => {
                setConfirming(false);
                onDelete(conversation.id);
              }}
            >
              {t('nav.deleteYes')}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setConfirming(false)}
            >
              {t('nav.deleteNo')}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={active ? 'conv-row is-active' : 'conv-row'}>
      <button
        type="button"
        className="conv-select"
        onClick={() => onSelect(conversation.id)}
        aria-current={active ? 'true' : undefined}
        title={conversation.title}
      >
        <ChatIcon size={15} />
        <span className="conv-title">{conversation.title || t('nav.newChat')}</span>
      </button>
      <button
        type="button"
        className="conv-delete"
        onClick={() => setConfirming(true)}
        aria-label={`${t('nav.delete')}: ${conversation.title}`}
        title={t('nav.delete')}
      >
        <TrashIcon size={14} />
      </button>
    </li>
  );
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  health: HealthResponse | null;
  offline: boolean;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  collapsed,
  health,
  offline,
  closeButtonRef,
  onNewChat,
  onSelect,
  onDelete,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const t = useT();

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <LogoMark size={30} />
          <span className="brand-name">{t('app.title')}</span>
        </div>
        <button
          type="button"
          className="icon-button sidebar-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
        >
          <PanelIcon size={17} />
        </button>
        <button
          ref={closeButtonRef}
          type="button"
          className="icon-button sidebar-close"
          onClick={onCloseMobile}
          aria-label={t('nav.closeMenu')}
        >
          <CloseIcon size={17} />
        </button>
      </div>

      <button type="button" className="new-chat" onClick={onNewChat}>
        <PlusIcon size={16} />
        <span className="new-chat-label">{t('nav.newChat')}</span>
      </button>

      <nav className="conv-nav" aria-label={t('nav.conversations')}>
        <h2 className="conv-label">{t('nav.conversations')}</h2>
        {conversations.length === 0 ? (
          <p className="conv-empty">{t('nav.empty')}</p>
        ) : (
          <ul className="conv-list">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar-foot">
        <LangSwitcher full={!collapsed} />
        <div className="sidebar-status">
          <ProviderBadge health={health} offline={offline} />
        </div>
        <p className="sidebar-note">{t('nav.localNote')}</p>
      </div>
    </aside>
  );
}
