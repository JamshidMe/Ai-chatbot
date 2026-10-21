import { useCallback, useEffect } from 'react';

/**
 * postMessage bridge between the /embed iframe and the host page loader.
 *
 * Security: the iframe never accepts a message from an arbitrary origin. The
 * expected parent origin is passed in the iframe URL by our own loader, and both
 * `event.origin` and `event.source` are checked before acting.
 */

export type BridgeInbound =
  | { type: 'chatbot:set-lang'; lang?: unknown }
  | { type: 'chatbot:close' }
  | { type: 'chatbot:ping' };

export function getParentOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('parentOrigin');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** True when the page is running inside the widget's iframe. */
export function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

export function postToParent(message: Record<string, unknown>): void {
  const origin = getParentOrigin();
  if (!origin || !isEmbedded()) return;
  window.parent.postMessage(message, origin);
}

export function useParentMessages(onMessage: (message: BridgeInbound) => void): void {
  const stable = useCallback(onMessage, [onMessage]);

  useEffect(() => {
    const origin = getParentOrigin();
    if (!origin) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== window.parent) return;
      const data = event.data as BridgeInbound | null;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
      stable(data);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [stable]);
}
