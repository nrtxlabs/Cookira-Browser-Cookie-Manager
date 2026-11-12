import { describe, expect, it } from 'vitest';
import { toChromeCookieSetDetails, validateCookieDraft } from '../../src/core/cookieRules';
import { buildCookieUrl, domainMatchesHost } from '../../src/core/cookieUrl';
import type { CookieDraft } from '../../src/core/types';

function makeDraft(overrides: Partial<CookieDraft> = {}): CookieDraft {
  return {
    name: 'session_id',
    value: 'abc123',
    domain: 'app.example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    hostOnly: true,
    session: false,
    expirationDate: 1900000000,
    sameSite: 'lax',
    ...overrides,
  };
}

describe('cookieUrl & cookieRules', () => {
  it('builds URLs stripping leading domain dots and respecting secure protocol', () => {
    expect(buildCookieUrl('.example.com', '/api', true)).toBe('https://example.com/api');
    expect(buildCookieUrl('localhost', 'v1', false)).toBe('http://localhost/v1');
  });

  it('matches subdomains cleanly when includeSubdomains is enabled', () => {
    expect(domainMatchesHost('.example.com', 'app.example.com', true)).toBe(true);
    expect(domainMatchesHost('api.example.com', 'example.com', true)).toBe(true);
    expect(domainMatchesHost('.example.com', 'app.example.com', false)).toBe(false);
    expect(domainMatchesHost('evil-example.com', 'example.com', true)).toBe(false);
  });

  it('omits domain on chrome.cookies.set when hostOnly=true and sets domain when hostOnly=false', () => {
    const hostOnlyDetails = toChromeCookieSetDetails(makeDraft({ hostOnly: true }));
    expect(hostOnlyDetails.domain).toBeUndefined();
    expect(hostOnlyDetails.url).toBe('https://app.example.com/');

    const domainDetails = toChromeCookieSetDetails(
      makeDraft({ hostOnly: false, domain: '.example.com' }),
    );
    expect(domainDetails.domain).toBe('example.com');
    expect(domainDetails.url).toBe('https://example.com/');
  });

  it('enforces __Host- and __Secure- prefix invariants strictly', () => {
    expect(
      validateCookieDraft(
        makeDraft({ name: '__Host-csrf', hostOnly: false, path: '/app', secure: false }),
      ),
    ).toHaveLength(3);

    expect(
      validateCookieDraft(
        makeDraft({ name: '__Host-csrf', hostOnly: true, path: '/', secure: true }),
      ),
    ).toHaveLength(0);

    expect(
      validateCookieDraft(makeDraft({ name: '__Secure-tok', secure: false })),
    ).toContain('Cookies prefixed with "__Secure-" must have Secure enabled.');
  });

  it('rejects SameSite=no_restriction without Secure=true', () => {
    expect(
      validateCookieDraft(makeDraft({ sameSite: 'no_restriction', secure: false })),
    ).toContain('SameSite=None ("no_restriction") requires Secure=true.');
  });

  it('preserves partitionKey and omits expirationDate for session cookies', () => {
    const details = toChromeCookieSetDetails(
      makeDraft({
        session: true,
        expirationDate: 1900000000,
        partitionKey: { topLevelSite: 'https://parent.example', hasCrossSiteAncestor: false },
      }),
    ) as chrome.cookies.SetDetails & { partitionKey?: { topLevelSite?: string } };

    expect(details.expirationDate).toBeUndefined();
    expect(details.partitionKey?.topLevelSite).toBe('https://parent.example');
  });
});
