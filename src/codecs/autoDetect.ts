import type { CookieDraft, DetectedImportFormat } from '../core/types';
import { parseCookiesFromHeader } from './headerCodec';
import { parseCookiesFromJson } from './jsonCodec';
import { parseCookiesFromNetscape } from './netscapeCodec';

export function detectImportFormat(rawText: string): DetectedImportFormat {
  const trimmed = rawText.trim();
  if (!trimmed) return 'unknown';

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        (parsed as { format?: string }).format === 'cookira-vault'
      ) {
        return 'encrypted';
      }
      return 'json';
    } catch {
      return 'unknown';
    }
  }

  const lines = trimmed.split(/\r?\n/);
  const hasNetscapeMarker = lines.some(
    (line) =>
      line.includes('Netscape HTTP Cookie File') ||
      line.startsWith('#HttpOnly_') ||
      (!line.trim().startsWith('#') && line.split('\t').length >= 7),
  );
  if (hasNetscapeMarker) {
    return 'netscape';
  }

  if (/^(cookie\s*:)?\s*[^=\s;]+=/i.test(trimmed)) {
    return 'header';
  }

  return 'unknown';
}

export function parseAnyCookiePayload(options: {
  rawText: string;
  fallbackDomain?: string;
  secureDefault?: boolean;
}): { format: DetectedImportFormat; drafts: CookieDraft[] } {
  const format = detectImportFormat(options.rawText);

  if (format === 'encrypted') {
    throw new Error('Encrypted Cookira vault detected. Enter passphrase to decrypt first.');
  }
  if (format === 'json') {
    return {
      format,
      drafts: parseCookiesFromJson(options.rawText, options.fallbackDomain),
    };
  }
  if (format === 'netscape') {
    return {
      format,
      drafts: parseCookiesFromNetscape(options.rawText),
    };
  }
  if (format === 'header') {
    return {
      format,
      drafts: parseCookiesFromHeader(
        options.rawText,
        options.fallbackDomain ?? '',
        options.secureDefault ?? true,
      ),
    };
  }

  throw new Error('Unrecognized cookie format. Supports JSON, Netscape .txt, Cookie header, or Cookira Encrypted Vault.');
}
