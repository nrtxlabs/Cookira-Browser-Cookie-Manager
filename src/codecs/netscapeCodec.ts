import type { CookieDraft, CookieRecord } from '../core/types';
import { normalizeDomainHost } from '../core/cookieUrl';

const NETSCAPE_HEADER = [
  '# Netscape HTTP Cookie File',
  '# Exported by Cookira (NRTX Labs)',
  '# This is a generated file! Do not edit unless you know what you are doing.',
  '',
].join('\n');

export function serializeCookiesToNetscape(cookies: CookieRecord[]): string {
  const lines = cookies.map((c) => {
    const baseDomain = c.hostOnly
      ? normalizeDomainHost(c.domain)
      : `.${normalizeDomainHost(c.domain)}`;
    const domainField = c.httpOnly ? `#HttpOnly_${baseDomain}` : baseDomain;
    const includeSubdomains = c.hostOnly ? 'FALSE' : 'TRUE';
    const pathField = c.path || '/';
    const secureField = c.secure ? 'TRUE' : 'FALSE';
    const expiryField =
      c.session || typeof c.expirationDate !== 'number'
        ? '0'
        : String(Math.floor(c.expirationDate));
    const safeValue = c.value.replace(/[\r\n\t]/g, '');
    return [domainField, includeSubdomains, pathField, secureField, expiryField, c.name, safeValue].join(
      '\t',
    );
  });

  return `${NETSCAPE_HEADER}${lines.join('\n')}\n`;
}

export function parseCookiesFromNetscape(rawText: string): CookieDraft[] {
  const lines = rawText.split(/\r?\n/);
  const drafts: CookieDraft[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    let httpOnly = false;
    let effectiveLine = line;
    if (line.startsWith('#HttpOnly_')) {
      httpOnly = true;
      effectiveLine = line.slice('#HttpOnly_'.length);
    } else if (line.startsWith('#')) {
      continue;
    }

    const parts = effectiveLine.split('\t');
    if (parts.length < 7) {
      throw new Error(`Invalid Netscape cookie line: expected 7 tab-separated columns.`);
    }

    const [domainRaw, flagRaw, pathRaw, secureRaw, expiryRaw, name, ...restValue] = parts;
    const value = restValue.join('\t');
    const expiryNum = Number(expiryRaw);
    const isSession = !Number.isFinite(expiryNum) || expiryNum <= 0;
    const hostOnly = flagRaw.trim().toUpperCase() !== 'TRUE' && !domainRaw.startsWith('.');
    const secure = secureRaw.trim().toUpperCase() === 'TRUE';

    drafts.push({
      name: name.trim(),
      value,
      domain: domainRaw.trim(),
      path: pathRaw.trim().startsWith('/') ? pathRaw.trim() : '/',
      secure,
      httpOnly,
      hostOnly,
      session: isSession,
      expirationDate: isSession ? undefined : expiryNum,
      sameSite: secure ? 'lax' : 'unspecified',
    });
  }

  return drafts;
}
