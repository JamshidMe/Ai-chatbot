import type { Lang } from '@shared/lang';

const LOCALE_TAG: Record<Lang, string> = {
  uz: 'uz-UZ',
  en: 'en-GB',
  ru: 'ru-RU',
};

/** Short local time (HH:MM) for a message timestamp. */
export function formatTime(timestamp: number | undefined, lang: Lang): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[lang] ?? 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

/** Up to two initials for a company monogram. */
export function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
