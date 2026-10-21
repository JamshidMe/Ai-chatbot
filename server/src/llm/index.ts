import { config, getDeepSeekKey, hasDeepSeekKey } from '../config.ts';
import { DeepSeekProvider } from './deepseek.ts';
import { MockProvider } from './mock.ts';
import type { LlmProvider } from './provider.ts';

let instance: LlmProvider | undefined;

/** The single place that decides which provider is active. */
export function getProvider(): LlmProvider {
  if (instance) return instance;

  instance =
    config.provider === 'deepseek'
      ? new DeepSeekProvider({
          apiKey: getDeepSeekKey(),
          baseUrl: config.deepseek.baseUrl,
          model: config.deepseek.model,
          thinking: config.deepseek.thinking,
          timeoutMs: config.deepseek.timeoutMs,
        })
      : new MockProvider();

  return instance;
}

/**
 * True only when a real provider is selected AND its key is present.
 * Deliberately false in the default mock configuration.
 */
export function isLiveModelConnected(): boolean {
  return config.provider === 'deepseek' && hasDeepSeekKey();
}

/** Human-readable startup banner. Never includes secrets. */
export function describeProvider(): string {
  const provider = getProvider();
  if (provider.isMock) {
    return 'provider=mock — MOCK MODE: no AI model is called, no API cost';
  }
  const status = isLiveModelConnected()
    ? 'LIVE'
    : 'NOT CONNECTED: DEEPSEEK_API_KEY is missing, requests will return 503';
  return `provider=deepseek model=${provider.model} — ${status}`;
}
