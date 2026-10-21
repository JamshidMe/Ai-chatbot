import { useEffect, useState } from 'react';
import type { Lang } from '@shared/lang';
import type { WidgetConfigResponse } from '@shared/types';

import { fetchWidgetConfig } from '../api';

interface WidgetConfigState {
  config: WidgetConfigResponse | null;
  failed: boolean;
}

/** Loads the public widget configuration (branding, limits, demo flag). */
export function useWidgetConfig(lang: Lang): WidgetConfigState {
  const [config, setConfig] = useState<WidgetConfigResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchWidgetConfig(lang)
      .then((result) => {
        if (cancelled) return;
        setConfig(result);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { config, failed };
}
