import { LANGS, normalizeLang, DEFAULT_LANG, type Lang } from '@shared/lang';
import { t as translate, type MessageKey } from '@shared/locales';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ai-chatbot.lang';

/**
 * Initial language resolution for the browser:
 *   saved preference -> navigator.languages -> DEFAULT_LANG.
 */
function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;

  const stored = normalizeLang(window.localStorage.getItem(STORAGE_KEY));
  if (stored) return stored;

  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const candidate of candidates) {
    const lang = normalizeLang(candidate);
    if (lang) return lang;
  }
  return DEFAULT_LANG;
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  languages: readonly Lang[];
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled: language simply won't persist.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, languages: LANGS }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const context = useContext(LangContext);
  if (!context) throw new Error('useLang() must be used inside <LangProvider>');
  return context;
}

/** Returns a stable `t(key, vars)` bound to the current language. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const { lang } = useLang();
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
}
