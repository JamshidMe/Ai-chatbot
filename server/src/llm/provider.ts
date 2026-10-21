import type { Lang } from '../../../shared/lang.ts';
import type { ChatUsage } from '../../../shared/types.ts';

export type ProviderName = 'mock' | 'deepseek';

export interface LlmTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateInput {
  systemPrompt: string;
  /** Bounded history plus the new user turn, oldest first. */
  turns: LlmTurn[];
  lang: Lang;
  maxTokens: number;
  temperature: number;
  requestId: string;
}

export interface LlmGenerateResult {
  text: string;
  provider: ProviderName;
  model: string;
  isMock: boolean;
  usage?: ChatUsage;
}

/**
 * The seam every provider implements. Swapping mock -> DeepSeek -> anything
 * else must require no change in routes, validation or the UI.
 */
export interface LlmProvider {
  readonly name: ProviderName;
  readonly model: string;
  readonly isMock: boolean;
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}

export type LlmErrorCode = 'provider_unavailable' | 'provider_failed';

export class LlmError extends Error {
  readonly code: LlmErrorCode;

  constructor(code: LlmErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LlmError';
    this.code = code;
  }
}
