import { resolveLang } from '../../../shared/lang.ts';
import { t } from '../../../shared/locales/index.ts';
import type { ApiErrorBody, ApiErrorCode } from '../../../shared/types.ts';
import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../http/ApiError.ts';
import { LlmError } from '../llm/provider.ts';
import { getRequestId } from './requestContext.ts';

function languageOf(req: Request) {
  const header = req.headers['accept-language'];
  return resolveLang(undefined, Array.isArray(header) ? header[0] : (header ?? null));
}

export function notFoundHandler(req: Request, res: Response): void {
  const lang = languageOf(req);
  const body: ApiErrorBody = {
    error: {
      code: 'not_found',
      message: t(lang, 'errors.invalidRequest'),
      lang,
      requestId: getRequestId(req),
    },
  };
  res.status(404).json(body);
}

/**
 * Final error handler. Converts everything into a localized ApiErrorBody and
 * never leaks stack traces, upstream payloads or environment values.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const lang = languageOf(req);
  const requestId = getRequestId(req);

  const send = (status: number, code: ApiErrorCode, message: string, details?: unknown): void => {
    const body: ApiErrorBody = {
      error: { code, message, lang, requestId, ...(details === undefined ? {} : { details }) },
    };
    res.status(status).json(body);
  };

  if (error instanceof ApiError) {
    send(error.status, error.code, t(lang, error.messageKey, error.vars), error.details);
    return;
  }

  if (error instanceof LlmError) {
    console.error(`[llm] ${requestId} ${error.code}: ${error.message}`);
    if (error.code === 'provider_unavailable') {
      send(503, 'provider_unavailable', t(lang, 'errors.providerUnavailable'));
    } else {
      send(502, 'provider_failed', t(lang, 'errors.providerFailed'));
    }
    return;
  }

  // express.json() failures
  const shape = error as { type?: string; status?: number } | null;
  if (shape?.type === 'entity.too.large') {
    send(413, 'payload_too_large', t(lang, 'errors.payloadTooLarge'));
    return;
  }
  if (error instanceof SyntaxError && shape?.status === 400) {
    send(400, 'invalid_request', t(lang, 'errors.invalidRequest'));
    return;
  }

  console.error(`[error] ${requestId}`, error);
  send(500, 'server_error', t(lang, 'errors.serverError'));
}
