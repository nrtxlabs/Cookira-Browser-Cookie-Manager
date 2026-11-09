import type { CookieDraft, CookieRecord } from '../core/types';
import { normalizeDomainHost } from '../core/cookieUrl';

export function serializeCookiesToHeader(cookies: CookieRecord[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * Parse raw `Cookie: a=1; b=2==` header strings cleanly by splitting on the
 * first `=` per semicolon pair (`indexOf('=')`) so Base64/JWT tokens never truncate.
 */
export function parseCookiesFromHeader(
  rawHeader: string,
  fallbackDomain: string,
  secureDefault = true,
): CookieDraft[] {
  const host = normalizeDomainHost(fallbackDomain);
  if (!host) {
    throw new Error('Target domain is required when importing raw Cookie headers.');
  }

  const stripped = rawHeader.trim().replace(/^cookie\s*:\s*/i, '');
  if (!stripped) return [];

  const segments = stripped.split(';');
  const drafts: CookieDraft[] = [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      throw new Error(`Malformed header pair "${trimmed}" (expected key=value).`);
    }

    const name = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    drafts.push({
      name,
      value,
      domain: host,
      path: '/',
      secure: name.startsWith('__Secure-') || name.startsWith('__Host-') ? true : secureDefault,
      httpOnly: false,
      hostOnly: name.startsWith('__Host-') ? true : true,
      session: true,
      sameSite: 'lax',
    });
  }

  return drafts;
}
