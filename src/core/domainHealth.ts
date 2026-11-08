import type { CookieRecord } from './types';

export interface DomainHealthSummary {
  totalCount: number;
  httpOnlyCount: number;
  secureCount: number;
  sessionCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  headerBytes: number;
  status: 'healthy' | 'elevated' | 'bloat_warning';
}

const EXPIRING_SOON_WINDOW_SEC = 24 * 60 * 60;
const ELEVATED_BYTES = 4096;
const BLOAT_WARNING_BYTES = 7168; // Close to typical 8 KB server Cookie header limit (HTTP 431)

export function isCookieExpired(cookie: CookieRecord, nowSec = Date.now() / 1000): boolean {
  if (cookie.session || typeof cookie.expirationDate !== 'number') {
    return false;
  }
  return cookie.expirationDate <= nowSec;
}

export function isCookieExpiringSoon(
  cookie: CookieRecord,
  nowSec = Date.now() / 1000,
): boolean {
  if (cookie.session || typeof cookie.expirationDate !== 'number') {
    return false;
  }
  const remaining = cookie.expirationDate - nowSec;
  return remaining > 0 && remaining <= EXPIRING_SOON_WINDOW_SEC;
}

export function computeCookieBytes(cookie: CookieRecord): number {
  return new TextEncoder().encode(`${cookie.name}=${cookie.value}`).length;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatExpiryRemaining(cookie: CookieRecord, nowSec = Date.now() / 1000): string {
  if (cookie.session || typeof cookie.expirationDate !== 'number') {
    return 'Session';
  }
  const diff = Math.floor(cookie.expirationDate - nowSec);
  if (diff <= 0) return 'Expired';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400)}d`;
  return `${(diff / (86400 * 365)).toFixed(1)}y`;
}

export function computeDomainHealth(
  cookies: CookieRecord[],
  nowSec = Date.now() / 1000,
): DomainHealthSummary {
  let httpOnlyCount = 0;
  let secureCount = 0;
  let sessionCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let headerBytes = 0;

  for (let i = 0; i < cookies.length; i += 1) {
    const c = cookies[i];
    if (c.httpOnly) httpOnlyCount += 1;
    if (c.secure) secureCount += 1;
    if (c.session) sessionCount += 1;
    if (isCookieExpired(c, nowSec)) expiredCount += 1;
    if (isCookieExpiringSoon(c, nowSec)) expiringSoonCount += 1;
    headerBytes += computeCookieBytes(c) + (i > 0 ? 2 : 0);
  }

  let status: DomainHealthSummary['status'] = 'healthy';
  if (headerBytes >= BLOAT_WARNING_BYTES) {
    status = 'bloat_warning';
  } else if (headerBytes >= ELEVATED_BYTES) {
    status = 'elevated';
  }

  return {
    totalCount: cookies.length,
    httpOnlyCount,
    secureCount,
    sessionCount,
    expiredCount,
    expiringSoonCount,
    headerBytes,
    status,
  };
}
