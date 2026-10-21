import { LANG_NAME } from '../../../shared/lang.ts';
import { t } from '../../../shared/locales/index.ts';

import type { LlmGenerateInput, LlmGenerateResult, LlmProvider } from './provider.ts';

/**
 * Mock provider: deterministic, offline, free.
 *
 * It exercises the entire request path (validation, language resolution,
 * history bounding, response shaping) without calling any AI model, so the UI
 * and API can be verified end to end. It is NOT an AI model.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock' as const;
  readonly model = 'mock-echo-v1';
  readonly isMock = true;

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const lastUserTurn = [...input.turns].reverse().find((turn) => turn.role === 'user');
    const message = (lastUserTurn?.content ?? '').slice(0, 200);

    const text = t(input.lang, 'mock.reply', {
      lang: LANG_NAME[input.lang],
      message,
    });

    return {
      text,
      provider: this.name,
      model: this.model,
      isMock: true,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}
