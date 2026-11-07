export const ICON_PATHS = {
  '16': 'icons/cookira-16.png',
  '32': 'icons/cookira-32.png',
  '48': 'icons/cookira-48.png',
  '128': 'icons/cookira-128.png',
};

/**
 * Build a valid Manifest V3 object for either Chromium (Chrome/Edge/Brave)
 * or Firefox WebExtension from one single source of truth.
 *
 * @param {'chrome' | 'firefox'} target
 * @param {string} [version]
 */
export function buildExtensionManifest(target, version = '1.0.0') {
  const base = {
    manifest_version: 3,
    name: 'Cookira — Browser Cookie Manager',
    short_name: 'Cookira',
    version,
    description:
      'Local-first Cyberpunk Terminal Cookie Editor, Multi-Format Export/Import (Playwright JSON, Netscape, Header), Account Profiles & AES-256-GCM Vault.',
    icons: ICON_PATHS,
    permissions:
      target === 'chrome'
        ? ['cookies', 'tabs', 'storage', 'sidePanel']
        : ['cookies', 'tabs', 'storage'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html',
      default_title: 'Cookira — Cookie Manager',
      default_icon: ICON_PATHS,
    },
    options_ui: {
      page: 'dashboard.html',
      open_in_tab: true,
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K',
        },
        description: 'Open Cookira Cookie Manager popup',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none';",
    },
  };

  if (target === 'firefox') {
    return {
      ...base,
      background: {
        scripts: ['background.js'],
        type: 'module',
      },
      sidebar_action: {
        default_panel: 'sidepanel.html',
        default_title: 'Cookira — Cookie Inspector',
        default_icon: ICON_PATHS,
      },
      browser_specific_settings: {
        gecko: {
          id: 'cookira@nrtxlabs.dev',
          strict_min_version: '115.0',
        },
      },
    };
  }

  return {
    ...base,
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  };
}
