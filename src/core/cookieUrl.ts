import type { CookieIdentityKey, CookiePartitionKey } from './types';

/**
 * Strip leading dot and brackets/whitespace from a cookie domain so it can be
 * safely used inside an HTTP(S) URL or normalized domain comparison.
 */
export function normalizeDomainHost(domain: string): string {
  return domain.trim().replace(/^\.+/, '').toLowerCase();
}

/**
 * Build a valid HTTP/HTTPS URL required by `chrome.cookies.set` and
 * `chrome.cookies.remove`. Handles leading dots and IPv6 hostnames cleanly.
 */
export function buildCookieUrl(domain: string, path = '/', secure = false): string {
  const host = normalizeDomainHost(domain);
  if (!host) {
    throw new Error('Cookie domain cannot be empty.');
  }
  const protocol = secure ? 'https://' : 'http://';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}${host}${normalizedPath}`;
}

/**
 * Extract hostname from a tab URL if it uses an inspectable web scheme.
 */
export function extractInspectableHost(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Determine whether a cookie's domain belongs to the active hostname.
 * When `includeSubdomains` is true, matches parent domains and subdomains
 * consistently with RFC 6265 domain-matching semantics.
 */
export function domainMatchesHost(
  cookieDomain: string,
  targetHost: string,
  includeSubdomains = true,
): boolean {
  const target = normalizeDomainHost(targetHost);
  const rawDomain = cookieDomain.trim().toLowerCase();
  const normalizedCookie = normalizeDomainHost(rawDomain);

  if (!target || !normalizedCookie) return false;
  if (normalizedCookie === target) return true;
  if (!includeSubdomains) return false;

  // Domain cookies (.example.com) apply to sub.example.com
  if (target.endsWith(`.${normalizedCookie}`)) return true;
  // Also include subdomain cookies (api.example.com) when viewing example.com
  if (normalizedCookie.endsWith(`.${target}`)) return true;

  return false;
}

/**
 * Build a deterministic identity string for deduplication, React keys, and diffing.
 */
export function cookieIdentityId(cookie: CookieIdentityKey): string {
  const part = cookie.partitionKey?.topLevelSite ?? '';
  const ancestor = cookie.partitionKey?.hasCrossSiteAncestor ? '1' : '0';
  return [
    cookie.storeId ?? '0',
    normalizeDomainHost(cookie.domain),
    cookie.domain.startsWith('.') ? 'dom' : 'host',
    cookie.path || '/',
    cookie.name,
    part,
    ancestor,
  ].join('::');
}

export function partitionKeysEqual(
  a?: CookiePartitionKey,
  b?: CookiePartitionKey,
): boolean {
  return (
    (a?.topLevelSite ?? '') === (b?.topLevelSite ?? '') &&
    Boolean(a?.hasCrossSiteAncestor) === Boolean(b?.hasCrossSiteAncestor)
  );
}
