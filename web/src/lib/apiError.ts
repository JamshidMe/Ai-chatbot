/**
 * Error type shared by the API layer and the UI.
 *
 * Deliberately dependency-free (no `@shared/*` imports) so it can be unit
 * tested with plain Node, outside the Vite alias graph.
 */
export class ApiClientError extends Error {
  /** Stable machine code, e.g. 'network_error' | 'timeout' | 'malformed_response'. */
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;

  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}
