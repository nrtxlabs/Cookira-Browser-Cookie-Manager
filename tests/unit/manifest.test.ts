import { describe, expect, it } from 'vitest';
import { buildExtensionManifest } from '../../src/manifest/buildManifest.mjs';
import { selectAutoCleanTargets } from '../../src/background/index';
import { DEFAULT_SETTINGS } from '../../src/storage/settingsStore';
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
});
