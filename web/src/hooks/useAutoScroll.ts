import { useCallback, useEffect, useRef } from 'react';

const STICK_THRESHOLD_PX = 96;

/**
 * Keeps the transcript pinned to the newest message, but only while the user is
 * already near the bottom — scrolling up to read older messages is never
 * interrupted by an incoming reply.
 */
export function useAutoScroll(dependencies: readonly unknown[]) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    pinnedRef.current = distanceFromBottom < STICK_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !pinnedRef.current) return;
    element.scrollTop = element.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { scrollRef, handleScroll };
}
