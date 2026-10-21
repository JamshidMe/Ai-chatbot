/**
 * Origin allow-listing for the embeddable widget.
 *
 * Pure functions (no config / no Express) so they can be unit tested directly.
 * An "origin" here is always a scheme+host+port tuple, e.g. `https://example.com`.
 */

/** Normalizes user input to a comparable origin, or null when unusable. */
export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '*') return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Parses a comma-separated allow-list, dropping invalid entries. */
export function parseOriginList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const origin = normalizeOrigin(part);
    if (origin && !result.includes(origin)) result.push(origin);
  }
  return result;
}

/**
 * True when the request origin may use the API / embed the widget.
 *
 * A missing Origin header (same-origin navigation, curl, server-to-server) is
 * NOT an authorization signal — it is handled by the caller. This helper only
 * answers "is this explicit origin on the allow-list (or the deployment's own
 * origin)?".
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
  selfOrigin?: string | null,
): boolean {
  if (!origin) return true; // Caller decides; see note above.
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (selfOrigin && normalized === selfOrigin) return true;
  return allowedOrigins.includes(normalized);
}

/**
 * Builds the CSP `frame-ancestors` directive.
 * `includeSelf` keeps the standalone app embeddable by itself (needed for the
 * dev preview page), never `*`.
 */
export function buildFrameAncestors(allowedOrigins: readonly string[], includeSelf: boolean): string {
  const parts: string[] = [];
  if (includeSelf) parts.push("'self'");
  for (const origin of allowedOrigins) parts.push(origin);
  return parts.length === 0 ? "'none'" : parts.join(' ');
}
