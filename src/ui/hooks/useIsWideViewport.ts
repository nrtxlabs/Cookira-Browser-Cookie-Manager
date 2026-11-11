import { useEffect, useState } from 'react';

const WIDE_QUERY = '(min-width: 1024px)';

export function useIsWideViewport(): boolean {
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(WIDE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsWide(event.matches);
    setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isWide;
}
