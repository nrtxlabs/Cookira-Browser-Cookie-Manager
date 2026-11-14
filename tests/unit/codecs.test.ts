import { describe, expect, it } from 'vitest';
import {
  detectImportFormat,
  parseAnyCookiePayload,
  parseCookiesFromHeader,
  parseCookiesFromJson,
  parseCookiesFromNetscape,
  serializeCookiesToCurl,
  serializeCookiesToHeader,
  serializeCookiesToJson,
  serializeCookiesToNetscape,
  serializeCookiesToPythonRequests,
} from '../../src/codecs';
import { buildImportPreview } from '../../src/core/cookieTransaction';
import type { CookieRecord } from '../../src/core/types';

const SAMPLE: CookieRecord[] = [
  {
    name: 'nrtx_auth',
    value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig==',
    domain: '.threads.com',
    path: '/',
    secure: true,
    httpOnly: true,
    hostOnly: false,
    session: false,
    expirationDate: 1900000000,
    sameSite: 'lax',
    storeId: '0',
  },
  {
    name: '__Host-csrf',
    value: 'token_val',
    domain: 'www.threads.com',
    path: '/',
    secure: true,
    httpOnly: false,
    hostOnly: true,
    session: true,
    sameSite: 'strict',
    storeId: '0',
  },
];

describe('Multi-format cookie codecs', () => {
  it('round-trips standard JSON and Playwright JSON formats', () => {
    const stdJson = serializeCookiesToJson(SAMPLE, 'standard');
    expect(detectImportFormat(stdJson)).toBe('json');
    const parsedStd = parseCookiesFromJson(stdJson);
    expect(parsedStd).toHaveLength(2);
    expect(parsedStd[0].hostOnly).toBe(false);
    expect(parsedStd[1].hostOnly).toBe(true);

    const pwJson = serializeCookiesToJson(SAMPLE, 'playwright');
    const parsedPw = parseCookiesFromJson(
      JSON.stringify({ cookies: JSON.parse(pwJson), origins: [] }),
    );
    expect(parsedPw[0].expirationDate).toBe(1900000000);
    expect(parsedPw[1].session).toBe(true);
    expect(parsedPw[1].sameSite).toBe('strict');
  });

  it('round-trips Netscape .txt preserving #HttpOnly_ and hostOnly flags', () => {
    const netscape = serializeCookiesToNetscape(SAMPLE);
    expect(detectImportFormat(netscape)).toBe('netscape');
    expect(netscape).toContain('#HttpOnly_.threads.com\tTRUE');
    expect(netscape).toContain('www.threads.com\tFALSE');

    const parsed = parseCookiesFromNetscape(netscape);
    expect(parsed[0].httpOnly).toBe(true);
    expect(parsed[0].hostOnly).toBe(false);
    expect(parsed[1].session).toBe(true);
    expect(parsed[1].hostOnly).toBe(true);
  });

  it('parses raw Cookie header without truncating "=" padding inside Base64/JWT values', () => {
    const header = serializeCookiesToHeader(SAMPLE);
    expect(detectImportFormat(`Cookie: ${header}`)).toBe('header');

    const parsed = parseCookiesFromHeader(`Cookie: ${header}`, 'www.threads.com');
    expect(parsed[0].value).toBe('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig==');
    expect(parsed[1].name).toBe('__Host-csrf');
  });

  it('throws cleanly on unrecognized or invalid import payloads', () => {
    expect(() => parseAnyCookiePayload({ rawText: 'not-valid-cookie-payload' })).toThrow();
    expect(() => parseCookiesFromJson('{broken json')).toThrow();
  });

  it('builds pre-import diff classifying new, overwrite, and invalid entries', () => {
    const preview = buildImportPreview(
      [
        {
          name: 'nrtx_auth',
          value: 'updated',
          domain: '.threads.com',
          path: '/',
          secure: true,
          httpOnly: true,
          hostOnly: false,
          session: true,
          sameSite: 'lax',
          storeId: '0',
        },
        {
          name: 'brand_new',
          value: 'v1',
          domain: 'threads.com',
          path: '/',
          secure: true,
          httpOnly: false,
          hostOnly: true,
          session: true,
          sameSite: 'lax',
          storeId: '0',
        },
        {
          name: '__Host-broken',
          value: 'x',
          domain: 'threads.com',
          path: '/wrong',
          secure: false,
          httpOnly: false,
          hostOnly: false,
          session: true,
          sameSite: 'lax',
        },
      ],
      SAMPLE,
    );

    expect(preview.map((p) => p.status)).toEqual(['overwrite', 'new', 'invalid']);
    expect(preview[2].errors.length).toBeGreaterThanOrEqual(2);
  });

  it('serializes POSIX-safe cURL and Python requests snippets', () => {
    const quotedCookie: CookieRecord = {
      ...SAMPLE[0],
      name: 'note',
      value: "a'b",
    };
    const curl = serializeCookiesToCurl([quotedCookie], 'threads.com');
    expect(curl).toContain("curl -sS -b 'note=a'\\''b' 'https://threads.com/'");

    const py = serializeCookiesToPythonRequests(SAMPLE, 'threads.com');
    expect(py).toContain('import requests');
    expect(py).toContain('"nrtx_auth":');
  });
});
