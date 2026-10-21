/**
 * Language primitives shared by the server and the web client.
 * Single source of truth for which languages the chatbot supports.
 */

export const LANGS = ['uz', 'en', 'ru'] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'en';

/** Narrowing guard for arbitrary input. */
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/**
 * Accepts 'uz', 'UZ', 'uz-UZ', 'uz_UZ', 'en-US', 'ru-RU'... and returns the
 * supported base language, or undefined when it is not one of uz/en/ru.
 */
export function normalizeLang(value: unknown): Lang | undefined {
  if (typeof value !== 'string') return undefined;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : undefined;
}

/**
 * Minimal `Accept-Language` parser: honours q-weights and regional variants.
 * Returns undefined when nothing supported is present.
 */
export function langFromAcceptLanguage(header: string | undefined | null): Lang | undefined {
  if (!header) return undefined;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '0') : 1;
      return { tag: (tag ?? '').trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const candidate of candidates) {
    const lang = normalizeLang(candidate.tag);
    if (lang) return lang;
  }
  return undefined;
}

/**
 * Resolution order used everywhere:
 * explicit request value -> Accept-Language header -> DEFAULT_LANG.
 */
export function resolveLang(explicit: unknown, acceptLanguage?: string | null): Lang {
  return normalizeLang(explicit) ?? langFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LANG;
}

/** Locale-independent label, useful for logs and prompts. */
export const LANG_NAME: Record<Lang, string> = {
  uz: 'Uzbek',
  en: 'English',
  ru: 'Russian',
};
