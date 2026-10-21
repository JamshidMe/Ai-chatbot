import type { NextFunction, Request, Response } from 'express';

import { resolveLang } from '../../../shared/lang.ts';
import { t } from '../../../shared/locales/index.ts';
import { config } from '../config.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import { RateLimiter } from './rateLimit.ts';

/** One limiter, two key spaces: `ip:<addr>` and `widget:<id>`. */
export const chatLimiter = new RateLimiter();

const WIDGET_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

function clientIp(req: Request): string {
  // `req.ip` honours `trust proxy`; falls back to the socket address.
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function widgetKey(req: Request): string {
  const header = req.get('x-widget-id');
  if (header && WIDGET_ID_PATTERN.test(header)) return header;
  return 'anonymous';
}

function blockedResponse(req: Request, res: Response, retryAfterSeconds: number): void {
  const header = req.headers['accept-language'];
  const lang = resolveLang(undefined, Array.isArray(header) ? header[0] : (header ?? null));

  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(429).json({
    error: {
      code: 'rate_limited',
      message: t(lang, 'errors.rateLimited', { seconds: retryAfterSeconds }),
      lang,
      requestId: getRequestId(req),
    },
  });
}

/**
 * Per-IP and per-widget limits for the expensive endpoint.
 * The IP bucket is checked before the widget bucket so a blocked client cannot
 * inflate the shared per-widget counter.
 */
export function chatRateLimit(req: Request, res: Response, next: NextFunction): void {
  const rule = { limit: config.rateLimit.maxPerIp, windowMs: config.rateLimit.windowMs };
  const ipResult = chatLimiter.consume(`ip:${clientIp(req)}`, rule);

  res.setHeader('RateLimit-Limit', String(ipResult.limit));
  res.setHeader('RateLimit-Remaining', String(ipResult.remaining));
  res.setHeader('RateLimit-Reset', String(ipResult.retryAfterSeconds));

  if (!ipResult.allowed) {
    blockedResponse(req, res, ipResult.retryAfterSeconds);
    return;
  }

  const widgetResult = chatLimiter.consume(`widget:${widgetKey(req)}`, {
    limit: config.rateLimit.maxPerWidget,
    windowMs: config.rateLimit.windowMs,
  });

  if (!widgetResult.allowed) {
    blockedResponse(req, res, widgetResult.retryAfterSeconds);
    return;
  }

  next();
}
