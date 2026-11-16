import type { AutoCleanRule, CookiraSettings } from '../core/types';
import { storageLocalGet, storageLocalSet } from '../core/browserApi';
import { domainMatchesPattern, normalizeDomainHost } from '../core/cookieUrl';

const SETTINGS_KEY = 'cookira_settings_v1';

export const DEFAULT_SETTINGS: CookiraSettings = {
  schemaVersion: 2,
  themeMode: 'system',
  uiMode: 'simple',
  preferredStoreFilter: 'all',
  defaultExportFormat: 'json',
  includeSubdomainsByDefault: true,
  confirmBeforeDelete: true,
  autoDecodeInspector: true,
  watcherEnabled: true,
  watcherMaxEvents: 200,
  lockedDomains: [],
  protectedWhitelist: [],
  autoCleanEnabled: false,
  autoCleanRules: [],
};

export function sanitizeSettings(raw: Partial<CookiraSettings> | null | undefined): CookiraSettings {
  const src = raw ?? {};
  const themeMode =
    src.themeMode === 'dark' || src.themeMode === 'light' || src.themeMode === 'system'
      ? src.themeMode
      : DEFAULT_SETTINGS.themeMode;
  const uiMode =
    src.uiMode === 'simple' || src.uiMode === 'advanced'
      ? src.uiMode
      : DEFAULT_SETTINGS.uiMode;
  const defaultExportFormat =
    src.defaultExportFormat === 'json' ||
    src.defaultExportFormat === 'netscape' ||
    src.defaultExportFormat === 'header'
      ? src.defaultExportFormat
      : DEFAULT_SETTINGS.defaultExportFormat;

  const watcherMaxEvents =
    typeof src.watcherMaxEvents === 'number' && src.watcherMaxEvents >= 20 && src.watcherMaxEvents <= 1000
      ? Math.floor(src.watcherMaxEvents)
      : DEFAULT_SETTINGS.watcherMaxEvents;

  const normalizeDomains = (list: unknown): string[] =>
    Array.isArray(list)
      ? [...new Set(list.map((d) => normalizeDomainHost(String(d))).filter(Boolean))]
      : [];

  const autoCleanRules: AutoCleanRule[] = Array.isArray(src.autoCleanRules)
    ? src.autoCleanRules
        .filter((r): r is AutoCleanRule => Boolean(r && typeof r.domainPattern === 'string'))
        .map((r) => {
          const trigger: AutoCleanRule['trigger'] =
            r.trigger === 'tab_close' ? 'tab_close' : 'startup';
          return {
            id: String(r.id || `rule_${Date.now()}`),
            domainPattern: normalizeDomainHost(r.domainPattern),
            trigger,
            enabled: Boolean(r.enabled),
          };
        })
        .filter((r) => Boolean(r.domainPattern))
    : [];

  return {
    schemaVersion: 2,
    themeMode,
    uiMode,
    preferredStoreFilter:
      typeof src.preferredStoreFilter === 'string' && src.preferredStoreFilter.trim()
        ? src.preferredStoreFilter.trim()
        : DEFAULT_SETTINGS.preferredStoreFilter,
    defaultExportFormat,
    includeSubdomainsByDefault:
      typeof src.includeSubdomainsByDefault === 'boolean'
        ? src.includeSubdomainsByDefault
        : DEFAULT_SETTINGS.includeSubdomainsByDefault,
    confirmBeforeDelete:
      typeof src.confirmBeforeDelete === 'boolean'
        ? src.confirmBeforeDelete
        : DEFAULT_SETTINGS.confirmBeforeDelete,
    autoDecodeInspector:
      typeof src.autoDecodeInspector === 'boolean'
        ? src.autoDecodeInspector
        : DEFAULT_SETTINGS.autoDecodeInspector,
    watcherEnabled:
      typeof src.watcherEnabled === 'boolean'
        ? src.watcherEnabled
        : DEFAULT_SETTINGS.watcherEnabled,
    watcherMaxEvents,
    lockedDomains: normalizeDomains(src.lockedDomains),
    protectedWhitelist: normalizeDomains(src.protectedWhitelist),
    autoCleanEnabled: Boolean(src.autoCleanEnabled),
    autoCleanRules,
  };
}

export async function loadSettings(): Promise<CookiraSettings> {
  const stored = await storageLocalGet<Partial<CookiraSettings>>(SETTINGS_KEY, {});
  return sanitizeSettings(stored);
}

export async function saveSettings(next: CookiraSettings): Promise<CookiraSettings> {
  const sanitized = sanitizeSettings(next);
  await storageLocalSet({ [SETTINGS_KEY]: sanitized });
  return sanitized;
}

export function exportSettingsJson(settings: CookiraSettings): string {
  return JSON.stringify(
    {
      format: 'cookira-settings',
      version: 2,
      exportedAt: Date.now(),
      settings,
    },
    null,
    2,
  );
}

export function parseSettingsBackupJson(rawText: string): CookiraSettings {
  const parsed = JSON.parse(rawText) as {
    format?: string;
    settings?: Partial<CookiraSettings>;
  };
  if (parsed?.format !== 'cookira-settings' || !parsed.settings) {
    throw new Error('Invalid Cookira settings backup file.');
  }
  return sanitizeSettings(parsed.settings);
}

export function isDomainLocked(host: string | null, settings: CookiraSettings): boolean {
  if (!host) return false;
  return settings.lockedDomains.some((locked) => domainMatchesPattern(host, locked));
}

export function isDomainProtectedFromClean(host: string, settings: CookiraSettings): boolean {
  return (
    settings.lockedDomains.some((d) => domainMatchesPattern(host, d)) ||
    settings.protectedWhitelist.some((d) => domainMatchesPattern(host, d))
  );
}
