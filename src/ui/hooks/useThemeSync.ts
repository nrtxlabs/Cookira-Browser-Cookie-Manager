import { useEffect, useState } from 'react';
import type { ThemeMode } from '../../core/types';

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Synchronizes Cookira's color scheme with the browser/OS preference when
 * `themeMode === 'system'`, or applies an explicit dark/light override.
 */
export function useThemeSync(themeMode: ThemeMode): 'dark' | 'light' {
  const [systemDark, setSystemDark] = useState<boolean>(readSystemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    setSystemDark(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const resolved: 'dark' | 'light' =
    themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'system') {
      root.setAttribute('data-theme', resolved);
    } else {
      root.setAttribute('data-theme', themeMode);
    }
    root.style.colorScheme = resolved;
  }, [themeMode, resolved]);

  return resolved;
}
