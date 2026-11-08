import type { CookieDraft, CookieRecord } from './types';
import { buildCookieUrl, normalizeDomainHost } from './cookieUrl';

const INVALID_NAME_CHARS = /[\s\x00-\x1f\x7f;=,()<>@:\\"/[\]?{}]/;
const CONTROL_CHARS = /[\r\n\x00]/;

export function validateCookieDraft(draft: CookieDraft): string[] {
  const errors: string[] = [];
  const name = draft.name ?? '';
  const domain = normalizeDomainHost(draft.domain ?? '');
  const path = draft.path || '/';

  if (!name.trim()) {
    errors.push('Cookie name is required.');
  } else if (INVALID_NAME_CHARS.test(name)) {
    errors.push('Cookie name contains invalid RFC 6265 token characters.');
  }

  if (CONTROL_CHARS.test(draft.value ?? '')) {
    errors.push('Cookie value cannot contain CR, LF, or NUL bytes.');
  }

  if (!domain) {
    errors.push('Cookie domain is required.');
  } else if (/\s/.test(domain)) {
    errors.push('Cookie domain cannot contain whitespace.');
  }

  if (!path.startsWith('/')) {
    errors.push('Cookie path must start with "/".');
  }

  if (name.startsWith('__Secure-') && !draft.secure) {
    errors.push('Cookies prefixed with "__Secure-" must have Secure enabled.');
  }

  if (name.startsWith('__Host-')) {
    if (!draft.secure) {
      errors.push('Cookies prefixed with "__Host-" must have Secure enabled.');
    }
    if (path !== '/') {
      errors.push('Cookies prefixed with "__Host-" must use Path "/".');
    }
    if (!draft.hostOnly) {
      errors.push('Cookies prefixed with "__Host-" must be HostOnly (no Domain attribute).');
    }
  }

  if (draft.sameSite === 'no_restriction' && !draft.secure) {
    errors.push('SameSite=None ("no_restriction") requires Secure=true.');
  }

  if (!draft.session) {
    if (
      typeof draft.expirationDate !== 'number' ||
      !Number.isFinite(draft.expirationDate) ||
      draft.expirationDate <= 0
    ) {
      errors.push('Persistent cookies require a valid positive expiration timestamp.');
    }
  }

  return errors;
}

/**
 * Convert an editor/imported CookieDraft into the exact `chrome.cookies.SetDetails`
 * payload. Crucial invariant: omitting `domain` preserves `hostOnly: true`,
 * whereas passing `domain` creates a domain cookie (`hostOnly: false`).
 */
export function toChromeCookieSetDetails(draft: CookieDraft): chrome.cookies.SetDetails {
  const errors = validateCookieDraft(draft);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const normalizedPath = draft.path && draft.path.startsWith('/') ? draft.path : '/';
  const url = buildCookieUrl(draft.domain, normalizedPath, draft.secure);
  const details: chrome.cookies.SetDetails & {
    partitionKey?: CookieDraft['partitionKey'];
  } = {
    url,
    name: draft.name,
    value: draft.value,
    path: normalizedPath,
    secure: draft.secure,
    httpOnly: draft.httpOnly,
    sameSite: draft.sameSite,
  };

  if (!draft.hostOnly) {
    details.domain = normalizeDomainHost(draft.domain);
  }

  if (!draft.session && typeof draft.expirationDate === 'number') {
    details.expirationDate = Math.floor(draft.expirationDate);
  }

  if (draft.storeId) {
    details.storeId = draft.storeId;
  }

  if (draft.partitionKey?.topLevelSite) {
    details.partitionKey = {
      topLevelSite: draft.partitionKey.topLevelSite,
      hasCrossSiteAncestor: draft.partitionKey.hasCrossSiteAncestor,
    };
  }

  return details;
}

export function cookieRecordToDraft(cookie: CookieRecord): CookieDraft {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    hostOnly: cookie.hostOnly,
    session: cookie.session,
    expirationDate: cookie.expirationDate,
    sameSite: cookie.sameSite,
    storeId: cookie.storeId,
    partitionKey: cookie.partitionKey ? { ...cookie.partitionKey } : undefined,
    originalKey: {
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      storeId: cookie.storeId,
      partitionKey: cookie.partitionKey ? { ...cookie.partitionKey } : undefined,
    },
  };
}
