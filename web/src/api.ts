import type { Lang } from '@shared/lang';
import {
  API_ROUTES,
  type ChatRequest,
  type ChatResponse,
  type HealthResponse,
  type WidgetConfigResponse,
} from '@shared/types';

import { ApiClientError } from './lib/apiError';
import { parseChatResponse, parseErrorBody, parseHealthResponse, parseJson } from './lib/chatResponse';

// Re-exported so existing imports (`import { ApiClientError } from '../api'`) keep working.
export { ApiClientError } from './lib/apiError';

/**
 * DeepSeek replies can take a while on a cold start, but must never hang the UI
 * forever: every request is bounded and surfaces as a recoverable error.
 */
const CHAT_TIMEOUT_MS = 45_000;
const HEALTH_TIMEOUT_MS = 10_000;
const WIDGET_TIMEOUT_MS = 8_000;

/**
 * Public widget id, learned from GET /api/widget at embed start-up. Sent as
 * `X-Widget-Id` so the backend can apply per-widget limits. It is a public
 * identifier, never a credential.
 */
let widgetContext: { widgetId: string } | null = null;

export function setWidgetContext(context: { widgetId: string } | null): void {
  widgetContext = context;
}

interface RawResponse {
  body: unknown;
  requestId: string | undefined;
}

async function requestJson(
  url: string,
  lang: Lang,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<RawResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Accept-Language': lang,
        ...(widgetContext ? { 'X-Widget-Id': widgetContext.widgetId } : {}),
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    });
  } catch {
    // An abort caused by our own timer is a timeout, not a dead network.
    if (controller.signal.aborted) {
      throw new ApiClientError('timeout', 'The request timed out.', 0);
    }
    throw new ApiClientError('network_error', 'network_error', 0);
  } finally {
    clearTimeout(timer);
  }

  const requestId = response.headers.get('X-Request-Id') ?? undefined;
  const text = await response.text().catch(() => '');

  if (!response.ok) {
    let parsedError: { code: string; message: string } | null = null;
    if (text.length > 0) {
      try {
        parsedError = parseErrorBody(JSON.parse(text) as unknown);
      } catch {
        parsedError = null; // Non-JSON error body (proxy, gateway, etc.).
      }
    }
    throw new ApiClientError(
      parsedError?.code ?? 'server_error',
      parsedError?.message || `HTTP ${response.status}`,
      response.status,
      requestId,
    );
  }

  if (text.length === 0) {
    throw new ApiClientError('malformed_response', 'The response body was empty.', response.status, requestId);
  }

  return { body: parseJson(text), requestId };
}

export async function fetchHealth(lang: Lang): Promise<HealthResponse> {
  const { body } = await requestJson(API_ROUTES.health, lang, undefined, HEALTH_TIMEOUT_MS);
  return parseHealthResponse(body);
}

export async function fetchWidgetConfig(lang: Lang): Promise<WidgetConfigResponse> {
  const { body } = await requestJson(API_ROUTES.widget, lang, undefined, WIDGET_TIMEOUT_MS);
  return body as WidgetConfigResponse;
}

export async function sendChatMessage(lang: Lang, payload: ChatRequest): Promise<ChatResponse> {
  const { body, requestId } = await requestJson(
    API_ROUTES.chat,
    lang,
    { method: 'POST', body: JSON.stringify(payload) },
    CHAT_TIMEOUT_MS,
  );
  return parseChatResponse(body, lang, requestId);
}
