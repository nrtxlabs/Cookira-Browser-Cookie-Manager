import type { CookieRecord } from '../core/types';
import { normalizeDomainHost } from '../core/cookieUrl';

function escapeSingleQuotedPosix(input: string): string {
  return input.replace(/'/g, "'\\''");
}

function buildCookiePairList(cookies: CookieRecord[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

function resolveTargetUrl(cookies: CookieRecord[], fallbackHost?: string | null): string {
  const host =
    normalizeDomainHost(fallbackHost ?? '') ||
    normalizeDomainHost(cookies[0]?.domain ?? '') ||
    'example.com';
  const usesHttps = cookies.some((c) => c.secure) || cookies.length === 0;
  return `${usesHttps ? 'https' : 'http'}://${host}/`;
}

/**
 * Generate a POSIX-safe single-quoted cURL command with Cookie header.
 */
export function serializeCookiesToCurl(
  cookies: CookieRecord[],
  fallbackHost?: string | null,
): string {
  const targetUrl = resolveTargetUrl(cookies, fallbackHost);
  const cookieHeader = buildCookiePairList(cookies);
  return `curl -sS -b '${escapeSingleQuotedPosix(cookieHeader)}' '${escapeSingleQuotedPosix(targetUrl)}'`;
}

/**
 * Generate a clean Python `requests` snippet with JSON-escaped cookie dict.
 */
export function serializeCookiesToPythonRequests(
  cookies: CookieRecord[],
  fallbackHost?: string | null,
): string {
  const targetUrl = resolveTargetUrl(cookies, fallbackHost);
  const dictObj: Record<string, string> = {};
  for (const c of cookies) {
    dictObj[c.name] = c.value;
  }
  return [
    'import requests',
    '',
    `cookies = ${JSON.stringify(dictObj, null, 2)}`,
    `response = requests.get(${JSON.stringify(targetUrl)}, cookies=cookies, timeout=15)`,
    'print(response.status_code)',
  ].join('\n');
}
