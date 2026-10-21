import type { NextFunction, Request, Response } from 'express';

import { resolveLang } from '../../../shared/lang.ts';
import { t } from '../../../shared/locales/index.ts';
import { config } from '../config.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import { isOriginAllowed, normalizeOrigin } from './origins.ts';

function requestLanguage(req: Request) {
  const header = req.headers['accept-language'];
  return resolveLang(undefined, Array.isArray(header) ? header[0] : (header ?? null));
}

function selfOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host') ?? ''}`;
}

/**
 * CORS for the API only.
 *
 * Important: CORS is a browser read-restriction, NOT authentication. The widget
 * is intentionally public (anyone may embed it); what actually protects the
 * backend is the allow-list below plus rate limits, input validation and the
 * fact that no tenant data is ever stored server-side.
 *
 * Requests without an `Origin` header (same-origin calls from our own pages,
 * curl, server-to-server) are passed through; blocking those would break the
 * standalone app without adding any protection, since a non-browser client can
 * forge `Origin` anyway.
 */
export function apiCors(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.origin;
  const origin = Array.isArray(header) ? header[0] : header;

  if (!origin) {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
    return;
  }

  if (!isOriginAllowed(origin, config.widget.allowedOrigins, selfOrigin(req))) {
    const lang = requestLanguage(req);
    res.status(403).json({
      error: {
        code: 'origin_not_allowed',
        message: t(lang, 'errors.originNotAllowed'),
        lang,
        requestId: getRequestId(req),
      },
    });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin) ?? origin);
  res.vary('Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept-Language, X-Widget-Id');
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
