import type { MessageKey } from '../../../shared/locales/index.ts';
import type { ApiErrorCode } from '../../../shared/types.ts';

/**
 * Transport-agnostic error carrying an HTTP status, a stable machine code and
 * a *translation key* (not a rendered string), so the error middleware can
 * localize it using the request's Accept-Language.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly messageKey: MessageKey;
  readonly vars?: Record<string, string | number>;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ApiErrorCode,
    messageKey: MessageKey,
    options?: { vars?: Record<string, string | number>; details?: unknown },
  ) {
    super(messageKey);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.messageKey = messageKey;
    this.vars = options?.vars;
    this.details = options?.details;
  }
}
