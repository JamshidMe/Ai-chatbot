import type { HealthResponse } from '@shared/types';
import type { RefObject } from 'react';

import { useT } from '../i18n/useLang';
import { MenuIcon } from './Icons';
import { ProviderBadge } from './ProviderBadge';

interface TopBarProps {
  title: string;
  health: HealthResponse | null;
  offline: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
}

export function TopBar({ title, health, offline, menuButtonRef, onOpenMenu }: TopBarProps) {
  const t = useT();

  return (
    <header className="topbar">
      <button
        ref={menuButtonRef}
        type="button"
        className="icon-button topbar-menu"
        onClick={onOpenMenu}
        aria-label={t('nav.openMenu')}
        aria-haspopup="dialog"
      >
        <MenuIcon size={18} />
      </button>

      <span className="topbar-title" title={title}>
        {title}
      </span>

      <ProviderBadge health={health} offline={offline} />
    </header>
  );
}
