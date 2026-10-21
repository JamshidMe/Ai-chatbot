import type { Lang } from '@shared/lang';
import { getLocaleMeta } from '@shared/locales';

import { useLang, useT } from '../i18n/useLang';

/** Compact UZ / EN / RU segmented control. */
export function LangSwitcher({ full = false }: { full?: boolean }) {
  const t = useT();
  const { lang, setLang, languages } = useLang();

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {languages.map((code: Lang) => {
        const meta = getLocaleMeta(code);
        const isActive = code === lang;
        return (
          <button
            key={code}
            type="button"
            className={isActive ? 'lang-option is-active' : 'lang-option'}
            onClick={() => setLang(code)}
            aria-pressed={isActive}
            aria-label={meta.name}
            title={meta.name}
          >
            {full ? meta.name : code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
