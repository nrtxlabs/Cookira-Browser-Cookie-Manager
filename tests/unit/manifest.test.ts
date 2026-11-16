import { describe, expect, it } from 'vitest';
import { buildExtensionManifest } from '../../src/manifest/buildManifest.mjs';
import { selectAutoCleanTargets } from '../../src/background/index';
import { domainMatchesPattern } from '../../src/core/cookieUrl';
import {
  DEFAULT_SETTINGS,
  exportSettingsJson,
  parseSettingsBackupJson,
  sanitizeSettings,
} from '../../src/storage/settingsStore';
import type { CookieRecord } from '../../src/core/types';

describe('Dual-target Manifest V3 & Auto-Clean Safety', () => {
  it('emits valid Chromium MV3 and Firefox WebExtension MV3 manifests from one source', () => {
    const chromeManifest = buildExtensionManifest('chrome', '1.0.0') as Record<string, unknown>;
    const firefoxManifest = buildExtensionManifest('firefox', '1.0.0') as Record<string, unknown>;

    expect(chromeManifest.manifest_version).toBe(3);
    expect(chromeManifest.side_panel).toEqual({ default_path: 'sidepanel.html' });
    expect((chromeManifest.background as { service_worker?: string }).service_worker).toBe(
      'background.js',
    );

    expect(firefoxManifest.manifest_version).toBe(3);
    expect(firefoxManifest.sidebar_action).toBeDefined();
    expect((firefoxManifest.background as { scripts?: string[] }).scripts).toEqual([
      'background.js',
    ]);
    expect(firefoxManifest.browser_specific_settings).toBeDefined();
  });

  it('keeps autoClean disabled by default and never touches locked or whitelisted domains', () => {
    const cookies: CookieRecord[] = [
      {
        name: 'tracker',
        value: '1',
        domain: '.ads.example',
        path: '/',
        secure: false,
        httpOnly: false,
        hostOnly: false,
        session: true,
        sameSite: 'lax',
        storeId: '0',
      },
      {
        name: 'bank_sess',
        value: '2',
        domain: '.bankmega.com',
        path: '/',
        secure: true,
        httpOnly: true,
        hostOnly: false,
        session: true,
        sameSite: 'strict',
        storeId: '0',
      },
    ];

    expect(DEFAULT_SETTINGS.autoCleanEnabled).toBe(false);
    expect(
      selectAutoCleanTargets({
        cookies,
        settings: DEFAULT_SETTINGS,
        trigger: 'startup',
      }),
    ).toEqual([]);

    const enabledSettings = {
      ...DEFAULT_SETTINGS,
      autoCleanEnabled: true,
      lockedDomains: ['bankmega.com'],
      autoCleanRules: [
        { id: 'r1', domainPattern: 'ads.example', trigger: 'startup' as const, enabled: true },
        { id: 'r2', domainPattern: 'bankmega.com', trigger: 'startup' as const, enabled: true },
      ],
    };

    const targets = selectAutoCleanTargets({
      cookies,
      settings: enabledSettings,
      trigger: 'startup',
    });
    expect(targets.map((c) => c.name)).toEqual(['tracker']);
  });

  it('supports glob wildcard rules in auto-clean while honoring wildcard protected exclusions', () => {
    expect(domainMatchesPattern('pixel.tracker.example', '*.tracker.example')).toBe(true);
    expect(domainMatchesPattern('eu.pixel.tracker.example', '*.tracker.example')).toBe(true);
    expect(domainMatchesPattern('ads-us.example.net', 'ads-*.example.net')).toBe(true);
    expect(domainMatchesPattern('app.example.net', '*.tracker.example')).toBe(false);

    const makeCookie = (name: string, domain: string): CookieRecord => ({
      name,
      value: 'v',
      domain,
      path: '/',
      secure: true,
      httpOnly: false,
      hostOnly: false,
      session: true,
      sameSite: 'lax',
      storeId: '0',
    });

    const cookies: CookieRecord[] = [
      makeCookie('px', '.pixel.tracker.example'),
      makeCookie('ad', 'ads-eu.example.net'),
      makeCookie('vip_sso', 'sso.vip.tracker.example'),
      makeCookie('corp_ok', 'portal.corp.example'),
    ];

    const settings = {
      ...DEFAULT_SETTINGS,
      autoCleanEnabled: true,
      lockedDomains: ['*.vip.tracker.example'],
      protectedWhitelist: ['*corp*'],
      autoCleanRules: [
        { id: 'w1', domainPattern: '*.tracker.example', trigger: 'startup' as const, enabled: true },
        { id: 'w2', domainPattern: 'ads-*.example.net', trigger: 'startup' as const, enabled: true },
        { id: 'w3', domainPattern: '*.corp.example', trigger: 'startup' as const, enabled: true },
      ],
    };

    const targets = selectAutoCleanTargets({
      cookies,
      settings,
      trigger: 'startup',
    });
    expect(targets.map((c) => c.name)).toEqual(['px', 'ad']);
  });

  it('migrates legacy v1 settings payloads to schemaVersion 2 with preferredStoreFilter', () => {
    const migrated = sanitizeSettings({
      themeMode: 'dark',
      uiMode: 'advanced',
      lockedDomains: ['BankMega.com'],
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.preferredStoreFilter).toBe('all');
    expect(migrated.themeMode).toBe('dark');
    expect(migrated.lockedDomains).toEqual(['bankmega.com']);

    const legacyBackup = JSON.stringify({
      format: 'cookira-settings',
      version: 1,
      settings: {
        uiMode: 'advanced',
        protectedWhitelist: ['*.bankmega.com'],
      },
    });
    const parsedLegacy = parseSettingsBackupJson(legacyBackup);
    expect(parsedLegacy.schemaVersion).toBe(2);
    expect(parsedLegacy.protectedWhitelist).toEqual(['*.bankmega.com']);

    const exportedV2 = JSON.parse(exportSettingsJson(migrated)) as { version: number };
    expect(exportedV2.version).toBe(2);
  });
});
