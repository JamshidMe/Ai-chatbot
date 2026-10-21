import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.ts';
import { buildFrameAncestors } from './origins.ts';

/** Applied to every response. Deliberately narrow and non-breaking. */
export function baseHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
}

/**
 * API responses must never be framed or cached.
 * Only `frame-ancestors` is set here so nothing else is restricted by accident.
 */
export function apiHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * `frame-ancestors` for HTML documents.
 *
 *  - `app`   → the standalone console may only be framed by itself.
 *  - `embed` → may be framed by the configured widget origins (never `*`).
 *
 * Note there is intentionally no `X-Frame-Options` header: it cannot express an
 * allow-list, and setting it on /embed would block legitimate installs.
 */
export function applyHtmlHeaders(res: Response, scope: 'app' | 'embed'): void {
  const ancestors =
    scope === 'embed'
      ? buildFrameAncestors(config.widget.allowedOrigins, true)
      : "'self'";

  res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
