import type { CookieDraft, CookieRecord, SameSiteStatus } from '../core/types';
import { normalizeDomainHost } from '../core/cookieUrl';

export type JsonExportVariant = 'standard' | 'playwright';

function toPlaywrightSameSite(sameSite: SameSiteStatus): 'Strict' | 'Lax' | 'None' {
  if (sameSite === 'strict') return 'Strict';
  if (sameSite === 'no_restriction') return 'None';
  return 'Lax';
}

function parseIncomingSameSite(raw: unknown): SameSiteStatus {
  if (typeof raw !== 'string') return 'unspecified';
  const v = raw.trim().toLowerCase();
  if (v === 'strict') return 'strict';
  if (v === 'lax') return 'lax';
  if (v === 'none' || v === 'no_restriction') return 'no_restriction';
  return 'unspecified';
}

export function serializeCookiesToJson(
  cookies: CookieRecord[],
  variant: JsonExportVariant = 'standard',
): string {
  if (variant === 'playwright') {
    const mapped = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.hostOnly ? normalizeDomainHost(c.domain) : `.${normalizeDomainHost(c.domain)}`,
      path: c.path || '/',
      expires: c.session || typeof c.expirationDate !== 'number' ? -1 : Math.floor(c.expirationDate),
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: toPlaywrightSameSite(c.sameSite),
    }));
    return JSON.stringify(mapped, null, 2);
  }

  const standard = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    secure: c.secure,
    httpOnly: c.httpOnly,
    hostOnly: c.hostOnly,
    session: c.session,
    ...(typeof c.expirationDate === 'number' && !c.session
      ? { expirationDate: c.expirationDate }
      : {}),
    sameSite: c.sameSite,
    storeId: c.storeId,
    ...(c.partitionKey?.topLevelSite ? { partitionKey: c.partitionKey } : {}),
  }));
  return JSON.stringify(standard, null, 2);
}

export function parseCookiesFromJson(rawText: string, fallbackDomain = ''): CookieDraft[] {
  const parsed: unknown = JSON.parse(rawText);
  let items: unknown[];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { cookies?: unknown }).cookies)
  ) {
    // Supports Playwright storageState ({ cookies: [...], origins: [...] })
    items = (parsed as { cookies: unknown[] }).cookies;
  } else {
    throw new Error('JSON must be an array of cookies or a Playwright storageState object.');
  }

  return items.map((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Cookie entry at index ${idx} is not an object.`);
    }
    const obj = entry as Record<string, unknown>;
    const rawDomain =
      typeof obj.domain === 'string' && obj.domain.trim() ? obj.domain.trim() : fallbackDomain;
    const expRaw =
      typeof obj.expirationDate === 'number'
        ? obj.expirationDate
        : typeof obj.expires === 'number'
          ? obj.expires
          : undefined;

    const isSession =
      typeof obj.session === 'boolean'
        ? obj.session
        : expRaw === undefined || expRaw <= 0;

    // If hostOnly is explicitly provided, honor it; otherwise infer from leading dot
    const hostOnly =
      typeof obj.hostOnly === 'boolean'
        ? obj.hostOnly
        : !rawDomain.startsWith('.');

    const secure = Boolean(obj.secure);
    const sameSite = parseIncomingSameSite(obj.sameSite);
    const partitionRaw = obj.partitionKey as CookieRecord['partitionKey'] | undefined;

    return {
      name: typeof obj.name === 'string' ? obj.name : '',
      value: typeof obj.value === 'string' ? obj.value : String(obj.value ?? ''),
      domain: rawDomain,
      path: typeof obj.path === 'string' && obj.path.startsWith('/') ? obj.path : '/',
      secure,
      httpOnly: Boolean(obj.httpOnly),
      hostOnly,
      session: isSession,
      expirationDate: !isSession && typeof expRaw === 'number' ? expRaw : undefined,
      sameSite,
      storeId: typeof obj.storeId === 'string' ? obj.storeId : undefined,
      partitionKey: partitionRaw?.topLevelSite ? partitionRaw : undefined,
    };
  });
}
