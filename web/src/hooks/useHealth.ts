import type { HealthResponse } from '@shared/types';
import { useEffect, useState } from 'react';

import { fetchHealth } from '../api';
import type { Lang } from '@shared/lang';

export interface HealthState {
  health: HealthResponse | null;
  offline: boolean;
}

/** Mirrors the original App behaviour: re-reads /api/health when language changes. */
export function useHealth(lang: Lang): HealthState {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchHealth(lang)
      .then((result) => {
        if (cancelled) return;
        setHealth(result);
        setOffline(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHealth(null);
        setOffline(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { health, offline };
}
