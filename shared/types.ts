import type { Lang } from './lang.ts';

export const API_PREFIX = '/api';

export const API_ROUTES = {
  health: `${API_PREFIX}/health`,
  chat: `${API_PREFIX}/chat`,
  widget: `${API_PREFIX}/widget`,
} as const;

/**
 * Public configuration for the embedded widget. Contains NO secrets: it is
 * served to any origin that embeds the widget.
 */
export interface WidgetConfigResponse {
  /** Public identifier of this deployment's widget (not a secret). */
  widgetId: string;
  /** Company name used in the widget header and greeting. */
  companyName: string;
  /** Optional display title; empty string means "use the localized app title". */
  title: string;
  /** Optional custom greeting; empty string means "use the localized default". */
  greeting: string;
  /** Accent colour (hex triplet) used by the embed UI and the launcher. */
  accentColor: string;
  /** Launcher/panel side. */
  position: 'right' | 'left';
  /** True when the answers come from the bundled sample dataset. */
  demoData: boolean;
  languages: Lang[];
  limits: {
    maxMessageChars: number;
    maxHistoryMessages: number;
  };
  /** Whether WIDGET_ALLOWED_ORIGINS has been configured on the server. */
  embedRestricted: boolean;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

/** Request body for POST /api/chat. */
export interface ChatRequest {
  /** The user's new message. Trimmed and length-limited by the server. */
  message: string;
  /** Optional explicit language ('uz' | 'en' | 'ru'); falls back to Accept-Language. */
  lang?: string;
  /** Optional prior turns; the server keeps only the most recent ones. */
  history?: ChatHistoryItem[];
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatMeta {
  requestId: string;
  /** Character count actually accepted by the server. */
  receivedChars: number;
  /** How many history turns were forwarded to the provider. */
  historyUsed: number;
  /** True when older history turns were dropped to respect the limit. */
  historyTrimmed: boolean;
  latencyMs: number;
  /** Set when the answer was served from the server-side answer cache. */
  cached?: boolean;
}

/** Response body for POST /api/chat. */
export interface ChatResponse {
  reply: string;
  lang: Lang;
  /** True when the reply was generated from retrieved company evidence. */
  grounded: boolean;
  /** True when the question was refused for lack of company evidence. */
  refused: boolean;
  /** Ids of the company documents used as evidence (empty when refused). */
  sources: string[];
  /** 'mock' until a real provider is configured. */
  provider: string;
  model: string;
  isMock: boolean;
  usage?: ChatUsage;
  meta: ChatMeta;
  timestamp: string;
}

/** Response body for GET /api/health. */
export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  node: string;
  provider: string;
  model: string;
  isMock: boolean;
  /** True only when a real provider key is present AND the real provider is selected. */
  liveModelConnected: boolean;
  languages: Lang[];
  limits: {
    maxMessageChars: number;
    maxHistoryMessages: number;
  };
  /** Present on /api/health: which knowledge source is active. */
  knowledge?: {
    source: 'company' | 'sample' | 'none';
    documents: number;
    demo: boolean;
    loadedAt: string | null;
  };
  timestamp: string;
}

export type ApiErrorCode =
  | 'empty_message'
  | 'too_long'
  | 'invalid_request'
  | 'unsupported_language'
  | 'provider_unavailable'
  | 'provider_failed'
  | 'payload_too_large'
  | 'rate_limited'
  | 'invalid_widget'
  | 'origin_not_allowed'
  | 'not_found'
  | 'server_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    lang: Lang;
    requestId: string;
    details?: unknown;
  };
}
