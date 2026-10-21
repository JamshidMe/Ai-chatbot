import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export interface RequestWithId extends Request {
  requestId: string;
}

export function getRequestId(req: Request): string {
  return (req as Partial<RequestWithId>).requestId ?? 'unknown';
}

/**
 * Assigns a request id (echoed in the `X-Request-Id` header so client errors
 * can be correlated) and logs one line per request. Bodies are never logged.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      `[req] ${requestId} ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs.toFixed(1)}ms`,
    );
  });

  next();
}
