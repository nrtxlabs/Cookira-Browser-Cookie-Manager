import { describe, expect, it } from 'vitest';
import { inspectCookieValue } from '../../src/core/valueInspector';
import { computeDomainHealth, formatByteSize } from '../../src/core/domainHealth';
import type { CookieRecord } from '../../src/core/types';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('valueInspector & domainHealth', () => {
  it('decodes JWT headers and claims read-only without crashing on malformed inputs', () => {
    const jwt = `${toBase64Url('{"alg":"HS256","typ":"JWT"}')}.${toBase64Url(
      '{"sub":"rio_labs","exp":1900000000}',
    )}.sig_xyz`;

    const insight = inspectCookieValue(jwt);
    expect(insight.kind).toBe('jwt');
    expect(insight.jwtClaims?.sub).toBe('rio_labs');
    expect(insight.formatted).toContain('"alg": "HS256"');
  });

  it('detects URL-encoded JSON and malformed % sequences safely', () => {
    const urlEncoded = encodeURIComponent('{"theme":"cyber","v":1}');
    const insight = inspectCookieValue(urlEncoded);
    expect(insight.kind).toBe('url');
    expect(insight.label).toBe('URL-Encoded JSON');

    const malformed = inspectCookieValue('%E0%A4%A');
    expect(malformed.kind).toBe('raw');
  });

  it('calculates domain cookie header bloat warnings accurately', () => {
    const bigCookie: CookieRecord = {
      name: 'huge_payload',
      value: 'x'.repeat(7500),
      domain: 'app.example.com',
      path: '/',
      secure: true,
      httpOnly: false,
      hostOnly: true,
      session: true,
      sameSite: 'lax',
      storeId: '0',
    };
    const health = computeDomainHealth([bigCookie]);
    expect(health.status).toBe('bloat_warning');
    expect(formatByteSize(health.headerBytes)).toContain('KB');
  });
});
