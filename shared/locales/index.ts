import { DEFAULT_LANG, type Lang } from '../lang.ts';
import { en, type LocaleShape } from './en.ts';
import { ru } from './ru.ts';
import { uz } from './uz.ts';

export type LocaleDict = LocaleShape;

/** All supported dictionaries, keyed by language. */
export const LOCALES: Record<Lang, LocaleShape> = { uz, en, ru };

/**
 * Per-language fallback chain. Missing keys fall back to English rather than
 * showing a raw key in the UI.
 */
export const FALLBACK_CHAIN: Record<Lang, readonly Lang[]> = {
  uz: ['uz', 'en'],
  en: ['en'],
  ru: ['ru', 'en'],
};

/** Recursively builds the dotted-key union of a nested dictionary. */
type Leaves<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
    }[keyof T & string];

/** e.g. 'app.title' | 'chat.send' | 'errors.tooLong' ... */
export type MessageKey = Leaves<LocaleShape>;

function readPath(dict: LocaleShape, path: string): string | undefined {
  let current: unknown = dict;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Replaces `{token}` placeholders. Unknown tokens are left untouched. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/**
 * Translate a dotted key for the given language, with fallback.
 * Keys are type-checked, so a typo is a compile error, not a runtime 'undefined'.
 */
export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const chain = FALLBACK_CHAIN[lang] ?? FALLBACK_CHAIN[DEFAULT_LANG];
  for (const candidate of chain) {
    const value = readPath(LOCALES[candidate], key);
    if (value !== undefined) return interpolate(value, vars);
  }
  const fallback = readPath(en, key);
  return fallback === undefined ? key : interpolate(fallback, vars);
}

/** Display metadata for language switchers. */
export function getLocaleMeta(lang: Lang): { code: Lang; name: string; dir: string } {
  const dict = LOCALES[lang] ?? LOCALES[DEFAULT_LANG];
  return { code: lang, name: dict.meta.name, dir: dict.meta.dir };
}

export { en, ru, uz };
export type { LocaleShape };
