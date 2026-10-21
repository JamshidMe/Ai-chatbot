/**
 * Runtime note: the server is executed by Node's built-in TypeScript support
 * (`node src/index.ts`), which strips types instead of bundling. Therefore:
 *   - relative imports must carry the `.ts` extension, and
 *   - only erasable syntax is allowed (no enums / parameter properties).
 * `esbuild`-based runners such as tsx are avoided on purpose: their prebuilt
 * binary requires macOS 12+, and this project targets macOS 11 too.
 */
import { loadedEnvFiles } from './env.ts';

import { LANGS, type Lang } from '../../shared/lang.ts';
import { parseOriginList } from './security/origins.ts';

export type ProviderName = 'mock' | 'deepseek';

const PROVIDER_NAMES: readonly ProviderName[] = ['mock', 'deepseek'];

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    console.warn(`[config] ${name}="${raw}" is invalid (expected ${min}..${max}); using ${fallback}`);
    return fallback;
  }
  return value;
}

function readProvider(raw: string | undefined): ProviderName {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '') return 'mock';
  if ((PROVIDER_NAMES as readonly string[]).includes(value)) return value as ProviderName;
  console.warn(`[config] LLM_PROVIDER="${raw}" is unknown; falling back to "mock"`);
  return 'mock';
}

/**
 * Current official model IDs: `deepseek-flash` (DeepSeek-V4.1-Flash) and
 * `deepseek-v4-pro`. The old `deepseek-chat` / `deepseek-reasoner` aliases were
 * retired on 2026-07-24 and must not be used for new requests.
 */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';

const RETIRED_DEEPSEEK_MODELS: readonly string[] = ['deepseek-chat', 'deepseek-reasoner'];

/**
 * V4 enables thinking mode by default, which spends the token budget on
 * reasoning before any visible answer. This chat needs short plain replies, so
 * thinking is off unless explicitly enabled.
 */
export type ThinkingMode = 'enabled' | 'disabled';

function readThinking(raw: string | undefined): ThinkingMode {
  return (raw ?? '').trim().toLowerCase() === 'enabled' ? 'enabled' : 'disabled';
}

function readModel(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  const model = value === '' ? DEFAULT_DEEPSEEK_MODEL : value;
  if (RETIRED_DEEPSEEK_MODELS.includes(model)) {
    console.warn(
      `[config] DEEPSEEK_MODEL="${model}" is a retired model ID (retired 2026-07-24). ` +
        `Set DEEPSEEK_MODEL=${DEFAULT_DEEPSEEK_MODEL} in .env before enabling LLM_PROVIDER=deepseek.`,
    );
  }
  return model;
}

/**
 * `trust proxy` must stay off unless the app really runs behind a proxy:
 * trusting a spoofable X-Forwarded-For would let clients bypass per-IP limits.
 */
function readTrustProxy(raw: string | undefined): boolean | number | string {
  const value = (raw ?? '').trim();
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  const asNumber = Number.parseInt(value, 10);
  if (Number.isFinite(asNumber) && String(asNumber) === value) return asNumber;
  return value; // e.g. 'loopback' or a comma-separated subnet list
}

/** Public widget identifier: must be URL-safe and carry no secrets. */
const WIDGET_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

function readWidgetId(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (value === '') return 'wgt_public_default';
  if (!WIDGET_ID_PATTERN.test(value)) {
    console.warn(
      '[config] WIDGET_ID must be 3-64 chars of [A-Za-z0-9_-]. Using the default public id.',
    );
    return 'wgt_public_default';
  }
  return value;
}


/** Branding must be plain data: a colour is a hex triplet, never free-form CSS. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function readHexColor(raw: string | undefined, fallback: string): string {
  const value = (raw ?? '').trim();
  if (value === '') return fallback;
  if (!HEX_COLOR.test(value)) {
    console.warn('[config] WIDGET_ACCENT_COLOR must look like #4f7cff; using default.');
    return fallback;
  }
  return value.toLowerCase();
}

function readPosition(raw: string | undefined): 'right' | 'left' {
  return (raw ?? '').trim().toLowerCase() === 'left' ? 'left' : 'right';
}

function readBool(raw: string | undefined, fallback: boolean): boolean {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '') return fallback;
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  return fallback;
}

function readFloat(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseFloat(raw.trim());
  if (!Number.isFinite(value) || value < min || value > max) {
    console.warn(`[config] ${name}="${raw}" is invalid (expected ${min}..${max}); using ${fallback}`);
    return fallback;
  }
  return value;
}

export const config = {
  serviceName: 'ai-chatbot-api',
  version: '0.1.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readInt('PORT', 8787, 1, 65535),
  /** 0.0.0.0 so container/PaaS hosts can route to the process. */
  host: (process.env.HOST ?? '').trim() || '0.0.0.0',
  trustProxy: readTrustProxy(process.env.TRUST_PROXY),
  provider: readProvider(process.env.LLM_PROVIDER),
  deepseek: {
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? '').trim() || 'https://api.deepseek.com',
    model: readModel(process.env.DEEPSEEK_MODEL),
    thinking: readThinking(process.env.DEEPSEEK_THINKING),
    timeoutMs: readInt('DEEPSEEK_TIMEOUT_MS', 30_000, 1_000, 120_000),
  },
  widget: {
    id: readWidgetId(process.env.WIDGET_ID),
    /** Public branding — safe to expose, no secrets. */
    companyName: (process.env.WIDGET_COMPANY_NAME ?? '').trim().slice(0, 80) || 'Company Assistant',
    title: (process.env.WIDGET_TITLE ?? '').trim().slice(0, 80),
    greeting: (process.env.WIDGET_GREETING ?? '').trim().slice(0, 240),
    accentColor: readHexColor(process.env.WIDGET_ACCENT_COLOR, '#4f7cff'),
    position: readPosition(process.env.WIDGET_POSITION),
    /**
     * Origins allowed to iframe /embed and to call the API cross-origin.
     * Empty means "not configured yet": embedding is then restricted to the
     * deployment's own origin.
     */
    allowedOrigins: parseOriginList(process.env.WIDGET_ALLOWED_ORIGINS),
  },
  rateLimit: {
    windowMs: readInt('RATE_LIMIT_WINDOW_MS', 60_000, 1_000, 3_600_000),
    maxPerIp: readInt('RATE_LIMIT_MAX_PER_IP', 30, 1, 10_000),
    maxPerWidget: readInt('RATE_LIMIT_MAX_PER_WIDGET', 120, 1, 100_000),
  },
  /** Company-only grounding. No real company data is bundled by default. */
  knowledge: {
    /** Directory (relative to `server/`) containing `company/` and `sample/`. */
    directory: (process.env.KNOWLEDGE_DIR ?? '').trim() || 'data',
    /** Sample data is only used when no company/ documents exist. */
    allowSample: readBool(process.env.KNOWLEDGE_ALLOW_SAMPLE, true),
    minScore: readFloat('KNOWLEDGE_MIN_SCORE', 0.3, 0, 1),
    maxDocuments: readInt('KNOWLEDGE_MAX_DOCUMENTS', 4, 1, 10),
  },
  /** Caches identical grounded questions to avoid paying twice for them. */
  answerCache: {
    ttlMs: readInt('ANSWER_CACHE_TTL_MS', 3_600_000, 0, 86_400_000),
    maxEntries: readInt('ANSWER_CACHE_MAX_ENTRIES', 500, 0, 10_000),
  },
  limits: {
    maxMessageChars: readInt('MAX_MESSAGE_CHARS', 2_000, 1, 20_000),
    maxHistoryMessages: readInt('MAX_HISTORY_MESSAGES', 20, 0, 100),
    maxBodyBytes: (process.env.MAX_BODY_BYTES ?? '').trim() || '16kb',
  },
  languages: LANGS as readonly Lang[],
  envFiles: loadedEnvFiles,
} as const;

/** Reads the key but never exposes it through logs or responses. */
export function getDeepSeekKey(): string {
  return (process.env.DEEPSEEK_API_KEY ?? '').trim();
}

/** Safe to log/return: only reports presence, never the value. */
export function hasDeepSeekKey(): boolean {
  return getDeepSeekKey().length > 0;
}
