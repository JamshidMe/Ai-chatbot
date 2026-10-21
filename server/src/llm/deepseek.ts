import type { ChatUsage } from '../../../shared/types.ts';

import {
  LlmError,
  type LlmGenerateInput,
  type LlmGenerateResult,
  type LlmProvider,
} from './provider.ts';

interface DeepSeekOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: 'enabled' | 'disabled';
  timeoutMs: number;
}

interface DeepSeekCompletion {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Real provider, implemented against the OpenAI-compatible
 * `/chat/completions` shape (base URL `https://api.deepseek.com`).
 *
 * Verified against the official API docs (2026-08): current model IDs are
 * `deepseek-flash` and `deepseek-v4-pro`; the legacy `deepseek-chat` /
 * `deepseek-reasoner` aliases were retired on 2026-07-24. Thinking mode is
 * default-on in V4, so it is sent explicitly.
 *
 * It is wired through the same `LlmProvider` interface as the mock and stays
 * inactive until `LLM_PROVIDER=deepseek` and `DEEPSEEK_API_KEY` are set.
 *
 * The API key is read from the environment only. It is never logged, echoed in
 * responses, or included in error messages.
 */
export class DeepSeekProvider implements LlmProvider {
  readonly name = 'deepseek' as const;
  readonly isMock = false;
  readonly model: string;

  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #thinking: 'enabled' | 'disabled';
  readonly #timeoutMs: number;

  constructor(options: DeepSeekOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.#thinking = options.thinking;
    this.#timeoutMs = options.timeoutMs;
    this.model = options.model;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    if (this.#apiKey === '') {
      throw new LlmError(
        'provider_unavailable',
        'DEEPSEEK_API_KEY is not set; the DeepSeek provider cannot be used.',
      );
    }

    const payload = {
      model: this.model,
      messages: [
        { role: 'system' as const, content: input.systemPrompt },
        ...input.turns.map((turn) => ({ role: turn.role, content: turn.content })),
      ],
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      // V4 defaults to thinking mode; state it explicitly so replies stay short.
      thinking: { type: this.#thinking },
      stream: false,
    };

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.#apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.name : 'unknown';
      throw new LlmError('provider_failed', `DeepSeek request failed (${reason}).`, { cause });
    }

    if (!response.ok) {
      // Response bodies may echo request metadata; keep the excerpt short.
      const detail = await response.text().catch(() => '');
      throw new LlmError(
        'provider_failed',
        `DeepSeek returned HTTP ${response.status}. ${detail.slice(0, 200)}`.trim(),
      );
    }

    const data = (await response.json()) as DeepSeekCompletion;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new LlmError('provider_failed', 'DeepSeek returned an empty completion.');
    }

    const usage: ChatUsage = {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    };

    return { text, provider: this.name, model: this.model, isMock: false, usage };
  }
}
