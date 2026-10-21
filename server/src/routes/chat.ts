import { resolveLang } from '../../../shared/lang.ts';
import { t } from '../../../shared/locales/index.ts';
import type { ChatHistoryItem, ChatMeta, ChatResponse } from '../../../shared/types.ts';
import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.ts';
import { ApiError } from '../http/ApiError.ts';
import { AnswerCache } from '../knowledge/answerCache.ts';
import { lookupCompanyContext } from '../knowledge/index.ts';
import { getProvider } from '../llm/index.ts';
import type { LlmTurn } from '../llm/provider.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import { buildGroundedPrompt, CHAT_MAX_TOKENS, CHAT_TEMPERATURE } from '../prompts/system.ts';
import { chatRateLimit } from '../security/limiters.ts';

/** Hard ceiling on the array length, independent of the configurable limit. */
const MAX_RAW_HISTORY = 100;

/** Control characters other than tab (09), newline (0A) and CR (0D). */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const historyItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const chatBodySchema = z.object({
  message: z.string(),
  lang: z.string().optional(),
  history: z.array(historyItemSchema).max(MAX_RAW_HISTORY).optional(),
});

const answerCache = new AnswerCache(config.answerCache.maxEntries, config.answerCache.ttlMs);

export const chatRouter = Router();

function buildMeta(
  requestId: string,
  message: string,
  historyUsed: number,
  historyTrimmed: boolean,
  startedAt: number,
  cached: boolean,
): ChatMeta {
  return {
    requestId,
    receivedChars: message.length,
    historyUsed,
    historyTrimmed,
    latencyMs: Date.now() - startedAt,
    ...(cached ? { cached: true } : {}),
  };
}

/**
 * POST /api/chat — company-grounded chat.
 *
 * Pipeline (each step can only narrow the answer):
 *   validate → identify widget → retrieve company evidence → refuse if none
 *   → serve from cache → otherwise ask the model with the evidence fenced off
 *     as untrusted data.
 *
 * The refusal path returns HTTP 200 with `refused: true` and `provider: policy`:
 * it is a valid answer, and it deliberately does NOT call the paid model.
 */
chatRouter.post('/', chatRateLimit, async (req, res) => {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  const header = req.headers['accept-language'];
  const acceptLanguage = Array.isArray(header) ? header[0] : (header ?? null);

  // Public widget identification (rate-limit key, not authentication).
  // Optional so the standalone app keeps working; a *present* value must match.
  const widgetHeader = req.get('x-widget-id');
  if (widgetHeader !== undefined && widgetHeader !== config.widget.id) {
    throw new ApiError(403, 'invalid_widget', 'errors.invalidWidget');
  }

  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'invalid_request', 'errors.invalidRequest', {
      // Only field paths and codes: never echo user content back.
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    });
  }

  const lang = resolveLang(parsed.data.lang, acceptLanguage);

  const message = parsed.data.message.trim();
  if (message.length === 0) {
    throw new ApiError(400, 'empty_message', 'errors.emptyMessage');
  }
  if (message.length > config.limits.maxMessageChars) {
    throw new ApiError(400, 'too_long', 'errors.tooLong', {
      vars: { max: config.limits.maxMessageChars },
      details: { max: config.limits.maxMessageChars, received: message.length },
    });
  }
  // Reject control characters (NUL, escape sequences, ...) that have no place in
  // chat input and are a common vector for log/terminal injection.
  if (CONTROL_CHARS.test(message)) {
    throw new ApiError(400, 'invalid_request', 'errors.invalidRequest');
  }

  // Bound conversation history: keep only the most recent N turns.
  const rawHistory = parsed.data.history ?? [];
  const boundedHistory = rawHistory.slice(-config.limits.maxHistoryMessages);
  const historyTrimmed = rawHistory.length > boundedHistory.length;

  const history: ChatHistoryItem[] = boundedHistory
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, config.limits.maxMessageChars),
    }))
    .filter((item) => item.content.length > 0);

  // ---------------------------------------------------------------- grounding
  const { base, outcome } = await lookupCompanyContext(message, lang);

  if (!outcome.sufficient) {
    // No evidence → fixed refusal. No model call, no cost, no invention.
    const body: ChatResponse = {
      reply: t(lang, 'assistant.refusal'),
      lang,
      grounded: false,
      refused: true,
      sources: [],
      provider: 'policy',
      model: 'none',
      isMock: false,
      meta: buildMeta(requestId, message, history.length, historyTrimmed, startedAt, false),
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
    return;
  }

  const sourceIds = outcome.matches.map((match) => match.doc.id);
  const cacheKey = `${base.loadedAt}|${lang}|${message.toLowerCase()}`;

  const cached = answerCache.get(cacheKey);
  if (cached) {
    const body: ChatResponse = {
      reply: cached.reply,
      lang,
      grounded: true,
      refused: false,
      sources: cached.sources,
      provider: cached.provider,
      model: cached.model,
      isMock: cached.isMock,
      meta: buildMeta(requestId, message, history.length, historyTrimmed, startedAt, true),
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
    return;
  }

  // ------------------------------------------------------------ model call
  const turns: LlmTurn[] = [
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user' as const, content: message },
  ];

  const provider = getProvider();
  const result = await provider.generate({
    systemPrompt: buildGroundedPrompt({
      lang,
      companyName: base.source === 'sample' ? `${base.companyName} — SAMPLE DATA` : base.companyName,
      evidence: outcome.matches,
      demo: base.source === 'sample',
    }),
    turns,
    lang,
    maxTokens: CHAT_MAX_TOKENS,
    temperature: CHAT_TEMPERATURE,
    requestId,
  });

  answerCache.set(cacheKey, {
    reply: result.text,
    sources: sourceIds,
    provider: result.provider,
    model: result.model,
    isMock: result.isMock,
  });

  const body: ChatResponse = {
    reply: result.text,
    lang,
    grounded: true,
    refused: false,
    sources: sourceIds,
    provider: result.provider,
    model: result.model,
    isMock: result.isMock,
    ...(result.usage === undefined ? {} : { usage: result.usage }),
    meta: buildMeta(requestId, message, history.length, historyTrimmed, startedAt, false),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(body);
});
