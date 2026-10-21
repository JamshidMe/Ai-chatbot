import type { HealthResponse } from '@shared/types';

import { useT } from '../i18n/useLang';

interface ProviderBadgeProps {
  health: HealthResponse | null;
  offline: boolean;
}

/**
 * Honest status chip: shows the real provider from /api/health, and says
 * "offline" when the API cannot be reached. Never claims a live model when the
 * backend reports mock mode.
 */
export function ProviderBadge({ health, offline }: ProviderBadgeProps) {
  const t = useT();

  if (offline) {
    return (
      <span className="chip chip-offline" title={t('errors.networkError')}>
        <span className="dot" aria-hidden="true" />
        {t('health.offline')}
      </span>
    );
  }

  if (!health) {
    return (
      <span className="chip" aria-hidden="true">
        <span className="dot" aria-hidden="true" />…
      </span>
    );
  }

  const details = `${t('health.provider')}: ${health.provider} · ${t('health.model')}: ${health.model}`;

  return (
    <span
      className={health.isMock ? 'chip chip-mock' : 'chip chip-live'}
      title={details}
    >
      <span className="dot" aria-hidden="true" />
      <span className="chip-text">
        {health.isMock ? t('mock.badge') : `${t('provider.live')} · ${health.model}`}
      </span>
    </span>
  );
}
