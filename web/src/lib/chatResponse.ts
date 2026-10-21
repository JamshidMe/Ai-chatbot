/**
 * Runtime parsing/validation for API responses.
 *
 * TypeScript types are erased at runtime, so a `200 OK` with a malformed body
 * would otherwise be trusted and written into conversation state. Everything
 * crossing the network boundary is validated here.
 *
 * Type-only imports keep this module free of runtime aliases, which makes it
 * testable with plain Node (see the unit checks run against this file).
 */
import type { ChatMeta, ChatResponse, HealthResponse } from '@shared/types';
import type { Lang } from '@shared/lang';

import { ApiClientError } from './apiError';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parses a raw response body, rejecting non-JSON payloads. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError('malformed_response', 'Response was not valid JSON.', 0);
  }
}

/** Extracts `{ code, message }` from a server error envelope, if present. */
export function parseErrorBody(raw: unknown): { code: string; message: string } | null {
  if (!isRecord(raw) || !isRecord(raw.error)) return null;
  const { code, message } = raw.error;
  if (typeof code !== 'string') return null;
  return { code, message: typeof message === 'string' ? message : '' };
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toMeta(value: unknown, requestId: string | undefined): ChatMeta {
  const meta = isRecord(value) ? value : {};
  return {
    requestId: typeof meta.requestId === 'string' ? meta.requestId : (requestId ?? ''),
    receivedChars: toNumber(meta.receivedChars),
    historyUsed: toNumber(meta.historyUsed),
    historyTrimmed: meta.historyTrimmed === true,
    latencyMs: toNumber(meta.latencyMs),
  };
}

/**
 * Validates and normalizes a chat response.
 *
 * Only a missing/empty `reply` is fatal — cosmetic metadata is defaulted so a
 * slightly older or newer server cannot break the transcript.
 */
export function parseChatResponse(raw: unknown, fallbackLang: Lang, requestId?: string): ChatResponse {
  if (!isRecord(raw)) {
    throw new ApiClientError('malformed_response', 'Chat response was not an object.', 0);
  }

  const reply = raw.reply;
  if (typeof reply !== 'string' || reply.trim().length === 0) {
    throw new ApiClientError('malformed_response', 'Chat response had no reply text.', 0);
  }

  const lang: Lang = raw.lang === 'uz' || raw.lang === 'en' || raw.lang === 'ru' ? raw.lang : fallbackLang;
  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    reply,
    lang,
    grounded: raw.grounded === true,
    refused: raw.refused === true,
    sources,
    provider: typeof raw.provider === 'string' ? raw.provider : 'unknown',
    model: typeof raw.model === 'string' ? raw.model : '',
    isMock: raw.isMock === true,
    ...(isRecord(raw.usage) ? { usage: raw.usage as ChatResponse['usage'] } : {}),
    meta: toMeta(raw.meta, requestId),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  };
}

/** Validates the health payload; unknown/absent fields fall back to safe defaults. */
export function parseHealthResponse(raw: unknown): HealthResponse {
  if (!isRecord(raw)) {
    throw new ApiClientError('malformed_response', 'Health response was not an object.', 0);
  }

  const limits = isRecord(raw.limits) ? raw.limits : {};
  const languages = Array.isArray(raw.languages)
    ? raw.languages.filter((item): item is Lang => item === 'uz' || item === 'en' || item === 'ru')
    : [];

  return {
    status: 'ok',
    service: typeof raw.service === 'string' ? raw.service : 'ai-chatbot-api',
    version: typeof raw.version === 'string' ? raw.version : '0.0.0',
    uptimeSeconds: toNumber(raw.uptimeSeconds),
    node: typeof raw.node === 'string' ? raw.node : '',
    provider: typeof raw.provider === 'string' ? raw.provider : 'unknown',
    model: typeof raw.model === 'string' ? raw.model : '',
    isMock: raw.isMock !== false,
    liveModelConnected: raw.liveModelConnected === true,
    languages: languages.length > 0 ? languages : ['uz', 'en', 'ru'],
    limits: {
      maxMessageChars: toNumber(limits.maxMessageChars, 2000),
      maxHistoryMessages: toNumber(limits.maxHistoryMessages, 20),
    },
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  };
}
