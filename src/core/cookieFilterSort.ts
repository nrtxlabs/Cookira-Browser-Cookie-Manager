import type { CookieRecord } from './types';
import { computeCookieBytes, isCookieExpired } from './domainHealth';

export type CookieFilterMode = 'all' | 'httpOnly' | 'secure' | 'session' | 'expired';
export type CookieSortMode = 'name' | 'size' | 'expiry';

export function filterAndSortCookies(
  scopedCookies: CookieRecord[],
  searchQuery: string,
  filterMode: CookieFilterMode,
  sortMode: CookieSortMode,
): CookieRecord[] {
  const q = searchQuery.trim().toLowerCase();
  const filtered = scopedCookies.filter((cookie) => {
    if (filterMode === 'httpOnly' && !cookie.httpOnly) return false;
    if (filterMode === 'secure' && !cookie.secure) return false;
    if (filterMode === 'session' && !cookie.session) return false;
    if (filterMode === 'expired' && !isCookieExpired(cookie)) return false;

    if (!q) return true;
    return (
      cookie.name.toLowerCase().includes(q) ||
      cookie.value.toLowerCase().includes(q) ||
      cookie.domain.toLowerCase().includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    if (sortMode === 'size') {
      return computeCookieBytes(b) - computeCookieBytes(a);
    }
    if (sortMode === 'expiry') {
      const expA = a.session ? Number.MAX_SAFE_INTEGER : (a.expirationDate ?? 0);
      const expB = b.session ? Number.MAX_SAFE_INTEGER : (b.expirationDate ?? 0);
      return expA - expB;
    }
    return a.name.localeCompare(b.name) || a.domain.localeCompare(b.domain);
  });
}

export function computeCookieFilterCounts(cookies: CookieRecord[]) {
  let httpOnly = 0;
  let secure = 0;
  let session = 0;
  let expired = 0;
  for (const c of cookies) {
    if (c.httpOnly) httpOnly += 1;
    if (c.secure) secure += 1;
    if (c.session) session += 1;
    if (isCookieExpired(c)) expired += 1;
  }
  return {
    all: cookies.length,
    httpOnly,
    secure,
    session,
    expired,
  };
}
