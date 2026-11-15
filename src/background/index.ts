import type { CookiraSettings, CookieRecord } from '../core/types';
import {
  getAllCookies,
  getCookiesApiRaw,
  getRuntimeApiRaw,
  getTabsApiRaw,
  removeBrowserCookie,
} from '../core/browserApi';
import {
  domainMatchesHost,
  domainMatchesPattern,
  extractInspectableHost,
} from '../core/cookieUrl';
import { isDomainProtectedFromClean, loadSettings } from '../storage/settingsStore';
import { appendWatcherEvent, mapChangeInfoCookie } from '../storage/watcherStore';

/**
 * Pure selector returning cookies eligible for auto-clean on a given trigger.
 * Respects `autoCleanEnabled === false`, `lockedDomains`, and `protectedWhitelist`.
 */
export function selectAutoCleanTargets(options: {
  cookies: CookieRecord[];
  settings: CookiraSettings;
  trigger: 'startup' | 'tab_close';
  closedHost?: string;
}): CookieRecord[] {
  const { cookies, settings, trigger, closedHost } = options;
  if (!settings.autoCleanEnabled) return [];

  const activeRules = settings.autoCleanRules.filter(
    (r) => r.enabled && r.trigger === trigger,
  );
  if (activeRules.length === 0) return [];

  return cookies.filter((cookie) => {
    if (isDomainProtectedFromClean(cookie.domain, settings)) {
      return false;
    }
    if (trigger === 'tab_close' && closedHost) {
      if (!domainMatchesHost(cookie.domain, closedHost, true)) {
        return false;
      }
    }
    return activeRules.some((rule) =>
      domainMatchesPattern(cookie.domain, rule.domainPattern),
    );
  });
}

async function runAutoClean(trigger: 'startup' | 'tab_close', closedHost?: string): Promise<void> {
  const settings = await loadSettings();
  if (!settings.autoCleanEnabled) return;
  const allCookies = await getAllCookies({});
  const targets = selectAutoCleanTargets({
    cookies: allCookies,
    settings,
    trigger,
    closedHost,
  });

  for (const cookie of targets) {
    try {
      await removeBrowserCookie(
        {
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path,
          storeId: cookie.storeId,
          partitionKey: cookie.partitionKey,
        },
        cookie.secure,
      );
    } catch {
      // Skip locked/system cookies
    }
  }
}

function registerBackgroundListeners(): void {
  const cookiesApi = getCookiesApiRaw();
  const tabsApi = getTabsApiRaw();
  const runtimeApi = getRuntimeApiRaw();

  const tabUrlCache = new Map<number, string>();

  if (cookiesApi?.onChanged) {
    cookiesApi.onChanged.addListener((changeInfo) => {
      void (async () => {
        const settings = await loadSettings();
        if (!settings.watcherEnabled) return;
        await appendWatcherEvent(
          {
            removed: Boolean(changeInfo.removed),
            cause: changeInfo.cause ?? 'explicit',
            cookie: mapChangeInfoCookie(changeInfo.cookie),
          },
          settings.watcherMaxEvents,
        );
      })();
    });
  }

  if (tabsApi?.onUpdated && tabsApi?.onRemoved) {
    tabsApi.onUpdated.addListener((tabId, changeInfo, tab) => {
      const url = changeInfo.url ?? tab.url;
      if (url) tabUrlCache.set(tabId, url);
    });

    tabsApi.onRemoved.addListener((tabId) => {
      const lastUrl = tabUrlCache.get(tabId);
      tabUrlCache.delete(tabId);
      const host = extractInspectableHost(lastUrl);
      if (!host) return;
      void (async () => {
        const remainingTabs = await tabsApi.query({});
        const stillOpen = remainingTabs.some(
          (t) => extractInspectableHost(t.url) === host,
        );
        if (!stillOpen) {
          await runAutoClean('tab_close', host);
        }
      })();
    });
  }

  if (runtimeApi?.onStartup) {
    runtimeApi.onStartup.addListener(() => {
      void runAutoClean('startup');
    });
  }

  const g = globalThis as unknown as {
    chrome?: { sidePanel?: { setPanelBehavior?: (opts: { openPanelOnActionClick: boolean }) => Promise<void> } };
  };
  if (g.chrome?.sidePanel?.setPanelBehavior) {
    void g.chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
}

if (typeof chrome !== 'undefined' || typeof (globalThis as { browser?: unknown }).browser !== 'undefined') {
  registerBackgroundListeners();
}
