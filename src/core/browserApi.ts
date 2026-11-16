import type {
  CookieIdentityKey,
  CookieRecord,
  CookieStoreInfo,
  SameSiteStatus,
} from './types';
import { buildCookieUrl } from './cookieUrl';

type RawBrowserGlobal = typeof chrome & {
  sidePanel?: {
    open?: (options: { windowId?: number; tabId?: number }) => Promise<void>;
    setPanelBehavior?: (options: { openPanelOnActionClick?: boolean }) => Promise<void>;
  };
  sidebarAction?: {
    open?: () => Promise<void>;
  };
  contextualIdentities?: {
    query?: (
      details: Record<string, never>,
    ) => Promise<Array<{ cookieStoreId: string; name: string; color?: string }>>;
  };
};

function getWebExtRoot(): RawBrowserGlobal | null {
  const g = globalThis as unknown as {
    browser?: RawBrowserGlobal;
    chrome?: RawBrowserGlobal;
  };
  return g.browser ?? g.chrome ?? null;
}

export function hasExtensionRuntime(): boolean {
  const root = getWebExtRoot();
  return Boolean(root?.cookies && root?.storage);
}

export function normalizeSameSite(raw?: string): SameSiteStatus {
  const val = (raw ?? 'unspecified').toLowerCase();
  if (val === 'no_restriction' || val === 'none') return 'no_restriction';
  if (val === 'lax') return 'lax';
  if (val === 'strict') return 'strict';
  return 'unspecified';
}

function mapRawCookie(raw: chrome.cookies.Cookie): CookieRecord {
  const partition = (raw as chrome.cookies.Cookie & { partitionKey?: CookieRecord['partitionKey'] })
    .partitionKey;
  return {
    name: raw.name,
    value: raw.value,
    domain: raw.domain,
    path: raw.path,
    secure: Boolean(raw.secure),
    httpOnly: Boolean(raw.httpOnly),
    hostOnly: Boolean(raw.hostOnly),
    session: Boolean(raw.session),
    expirationDate: typeof raw.expirationDate === 'number' ? raw.expirationDate : undefined,
    sameSite: normalizeSameSite(raw.sameSite),
    storeId: raw.storeId ?? '0',
    partitionKey: partition?.topLevelSite
      ? {
          topLevelSite: partition.topLevelSite,
          hasCrossSiteAncestor: partition.hasCrossSiteAncestor,
        }
      : undefined,
  };
}

export async function getAllCookies(
  details: chrome.cookies.GetAllDetails = {},
): Promise<CookieRecord[]> {
  const api = getWebExtRoot()?.cookies;
  if (!api) return [];
  const rawList = await api.getAll(details);
  return rawList.map(mapRawCookie);
}

export async function setBrowserCookie(
  details: chrome.cookies.SetDetails,
): Promise<CookieRecord | null> {
  const api = getWebExtRoot()?.cookies;
  if (!api) {
    throw new Error('Browser cookies API is unavailable outside an extension context.');
  }
  const result = await api.set(details);
  if (!result) {
    const runtimeError = getWebExtRoot()?.runtime?.lastError?.message;
    throw new Error(runtimeError || `Browser rejected setting cookie "${details.name ?? ''}".`);
  }
  return mapRawCookie(result);
}

export async function removeBrowserCookie(
  key: CookieIdentityKey,
  secure = true,
): Promise<void> {
  const api = getWebExtRoot()?.cookies;
  if (!api) {
    throw new Error('Browser cookies API is unavailable outside an extension context.');
  }

  const attempts = [true, false];
  const ordered = secure ? attempts : [false, true];
  let lastError: string | undefined;

  for (const useHttps of ordered) {
    const url = buildCookieUrl(key.domain, key.path || '/', useHttps);
    const details: Parameters<typeof chrome.cookies.remove>[0] & {
      partitionKey?: CookieIdentityKey['partitionKey'];
    } = {
      url,
      name: key.name,
      ...(key.storeId ? { storeId: key.storeId } : {}),
      ...(key.partitionKey?.topLevelSite ? { partitionKey: key.partitionKey } : {}),
    };

    try {
      const removed = await api.remove(details);
      if (removed) return;
      lastError = getWebExtRoot()?.runtime?.lastError?.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (lastError) {
    throw new Error(lastError);
  }
}

export function resolveStoreLabel(
  storeId: string,
  incognito?: boolean,
  containerName?: string,
): string {
  if (containerName) return containerName;
  if (incognito) return 'Incognito / Private';
  if (storeId === '0' || storeId === 'firefox-default') return 'Default';
  return `Store ${storeId}`;
}

export async function getAllCookieStores(): Promise<CookieStoreInfo[]> {
  const root = getWebExtRoot();
  const api = root?.cookies;
  if (!api?.getAllCookieStores) return [{ id: '0', tabIds: [], label: 'Default' }];

  const containerMap = new Map<string, { name: string; color?: string }>();
  if (root?.contextualIdentities?.query) {
    try {
      const identities = await root.contextualIdentities.query({});
      for (const id of identities) {
        containerMap.set(id.cookieStoreId, { name: id.name, color: id.color });
      }
    } catch {
      // Optional container permission unavailable
    }
  }

  const stores = await api.getAllCookieStores();
  return stores.map((store) => {
    const incognito = (store as chrome.cookies.CookieStore & { incognito?: boolean }).incognito;
    const container = containerMap.get(store.id);
    return {
      id: store.id,
      tabIds: [...store.tabIds],
      incognito,
      label: resolveStoreLabel(store.id, incognito, container?.name),
      containerColor: container?.color,
    };
  });
}

export async function getActiveTabInfo(): Promise<{
  id?: number;
  windowId?: number;
  url?: string;
  cookieStoreId?: string;
  incognito?: boolean;
} | null> {
  const tabsApi = getWebExtRoot()?.tabs;
  if (!tabsApi?.query) return null;
  const tabs = await tabsApi.query({ active: true, currentWindow: true });
  const tab = tabs[0] as
    | (chrome.tabs.Tab & { cookieStoreId?: string })
    | undefined;
  if (!tab) return null;
  return {
    id: tab.id,
    windowId: tab.windowId,
    url: tab.url,
    cookieStoreId: tab.cookieStoreId,
    incognito: tab.incognito,
  };
}

export async function storageLocalGet<T>(key: string, fallback: T): Promise<T> {
  const area = getWebExtRoot()?.storage?.local;
  if (!area) return fallback;
  const result = await area.get(key);
  return key in result ? (result[key] as T) : fallback;
}

export async function storageLocalSet(values: Record<string, unknown>): Promise<void> {
  const area = getWebExtRoot()?.storage?.local;
  if (!area) return;
  await area.set(values);
}

export async function getStorageBytesInUse(): Promise<number | null> {
  const area = getWebExtRoot()?.storage?.local as
    | (chrome.storage.StorageArea & { getBytesInUse?: (keys?: string | string[] | null) => Promise<number> })
    | undefined;
  if (!area?.getBytesInUse) return null;
  try {
    return await area.getBytesInUse(null);
  } catch {
    return null;
  }
}

const memorySessionFallback = new Map<string, unknown>();

export async function storageSessionGet<T>(key: string, fallback: T): Promise<T> {
  const sessionArea = getWebExtRoot()?.storage?.session;
  if (sessionArea) {
    const result = await sessionArea.get(key);
    return key in result ? (result[key] as T) : fallback;
  }
  return memorySessionFallback.has(key)
    ? (memorySessionFallback.get(key) as T)
    : fallback;
}

export async function storageSessionSet(values: Record<string, unknown>): Promise<void> {
  const sessionArea = getWebExtRoot()?.storage?.session;
  if (sessionArea) {
    await sessionArea.set(values);
    return;
  }
  for (const [k, v] of Object.entries(values)) {
    memorySessionFallback.set(k, v);
  }
}

export function getExtensionPageUrl(pageName: 'popup.html' | 'sidepanel.html' | 'dashboard.html'): string {
  const runtime = getWebExtRoot()?.runtime;
  if (runtime?.getURL) {
    return runtime.getURL(pageName);
  }
  return `./${pageName}`;
}

export async function openSidePanelView(): Promise<boolean> {
  const root = getWebExtRoot();
  if (root?.sidePanel?.open) {
    const tab = await getActiveTabInfo();
    if (tab?.windowId !== undefined) {
      await root.sidePanel.open({ windowId: tab.windowId });
      return true;
    }
  }
  if (root?.sidebarAction?.open) {
    await root.sidebarAction.open();
    return true;
  }
  return false;
}

export async function openDashboardTab(): Promise<void> {
  const root = getWebExtRoot();
  const url = getExtensionPageUrl('dashboard.html');
  if (root?.tabs?.create) {
    await root.tabs.create({ url });
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function getCookiesApiRaw(): typeof chrome.cookies | null {
  return getWebExtRoot()?.cookies ?? null;
}

export function getTabsApiRaw(): typeof chrome.tabs | null {
  return getWebExtRoot()?.tabs ?? null;
}

export function getRuntimeApiRaw(): typeof chrome.runtime | null {
  return getWebExtRoot()?.runtime ?? null;
}

export function getExtensionVersion(): string {
  const manifest = getRuntimeApiRaw()?.getManifest?.();
  return manifest?.version ?? 'dev';
}
