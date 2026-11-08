export interface DecodedValueInsight {
  kind: 'jwt' | 'json' | 'url' | 'base64' | 'raw';
  label: string;
  formatted: string;
  jwtClaims?: {
    sub?: string;
    iss?: string;
    exp?: number;
    iat?: number;
  };
}

function decodeBase64UrlToUtf8(segment: string): string | null {
  if (!/^[A-Za-z0-9\-_]+={0,2}$/.test(segment)) return null;
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded;
  } catch {
    return null;
  }
}

function tryParseJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (
    (!trimmed.startsWith('{') || !trimmed.endsWith('}')) &&
    (!trimmed.startsWith('[') || !trimmed.endsWith(']'))
  ) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Pure read-only inspector for cookie values (JWT, JSON, URL-encoded, Base64).
 * Never mutates the original cookie value.
 */
export function inspectCookieValue(rawValue: string): DecodedValueInsight {
  if (!rawValue) {
    return {
      kind: 'raw',
      label: 'Empty String',
      formatted: '(empty)',
    };
  }

  // 1. Check JWT (header.payload.signature)
  const jwtParts = rawValue.split('.');
  if (jwtParts.length === 3 && jwtParts[0].length > 4 && jwtParts[1].length > 4) {
    const headerStr = decodeBase64UrlToUtf8(jwtParts[0]);
    const payloadStr = decodeBase64UrlToUtf8(jwtParts[1]);
    const headerObj = headerStr ? tryParseJson(headerStr) : null;
    const payloadObj = payloadStr ? tryParseJson(payloadStr) : null;

    if (headerObj && payloadObj && typeof payloadObj === 'object' && !Array.isArray(payloadObj)) {
      const claims = payloadObj as Record<string, unknown>;
      return {
        kind: 'jwt',
        label: 'JWT (Read-Only Decoded)',
        formatted: JSON.stringify({ header: headerObj, payload: payloadObj }, null, 2),
        jwtClaims: {
          sub: typeof claims.sub === 'string' ? claims.sub : undefined,
          iss: typeof claims.iss === 'string' ? claims.iss : undefined,
          exp: typeof claims.exp === 'number' ? claims.exp : undefined,
          iat: typeof claims.iat === 'number' ? claims.iat : undefined,
        },
      };
    }
  }

  // 2. Check Direct JSON
  const directJson = tryParseJson(rawValue);
  if (directJson !== null) {
    return {
      kind: 'json',
      label: 'JSON Payload',
      formatted: JSON.stringify(directJson, null, 2),
    };
  }

  // 3. Check URL-Encoded
  if (/%[0-9A-Fa-f]{2}/.test(rawValue)) {
    try {
      const decodedUrl = decodeURIComponent(rawValue);
      if (decodedUrl !== rawValue) {
        const innerJson = tryParseJson(decodedUrl);
        return {
          kind: 'url',
          label: innerJson ? 'URL-Encoded JSON' : 'URL-Decoded',
          formatted: innerJson ? JSON.stringify(innerJson, null, 2) : decodedUrl,
        };
      }
    } catch {
      // Ignore malformed % sequences
    }
  }

  // 4. Check Base64 / Base64URL with readable text or JSON
  if (rawValue.length >= 8 && rawValue.length % 4 !== 1 && /^[A-Za-z0-9+/\-_]+={0,2}$/.test(rawValue)) {
    const decoded = decodeBase64UrlToUtf8(rawValue);
    if (decoded && !/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
      const innerJson = tryParseJson(decoded);
      if (innerJson || /^[\x20-\x7E\s]+$/.test(decoded)) {
        return {
          kind: 'base64',
          label: innerJson ? 'Base64 JSON' : 'Base64 UTF-8',
          formatted: innerJson ? JSON.stringify(innerJson, null, 2) : decoded,
        };
      }
    }
  }

  return {
    kind: 'raw',
    label: 'Raw String',
    formatted: rawValue,
  };
}
