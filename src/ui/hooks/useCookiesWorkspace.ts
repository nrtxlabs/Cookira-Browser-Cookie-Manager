import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CookieDraft,
  CookieRecord,
  CookieStoreInfo,
  CookiraSettings,
  UndoSnapshot,
} from '../../core/types';
import {
  getActiveTabInfo,
  getAllCookies,
  getAllCookieStores,
  getCookiesApiRaw,
  hasExtensionRuntime,
} from '../../core/browserApi';
import { cookieRecordToDraft } from '../../core/cookieRules';
import {
  cookieIdentityId,
  domainMatchesHost,
  extractInspectableHost,
  normalizeDomainHost,
} from '../../core/cookieUrl';
import {
  deleteCookiesBatchWithUndo,
  deleteSingleCookieWithUndo,
  saveCookieWithUndo,
} from '../../core/cookieMutations';
import { computeDomainHealth } from '../../core/domainHealth';
import {
  filterAndSortCookies,
  type CookieFilterMode,
  type CookieSortMode,
} from '../../core/cookieFilterSort';
import { DEFAULT_SETTINGS, isDomainLocked, loadSettings, saveSettings } from '../../storage/settingsStore';
import { loadUndoStack, popUndoSnapshot, pushUndoSnapshot } from '../../storage/undoStore';
import { restoreUndoSnapshot } from '../../core/cookieTransaction';

export type { CookieFilterMode, CookieSortMode };

export function useCookiesWorkspace() {
  const [settings, setSettings] = useState<CookiraSettings>(DEFAULT_SETTINGS);
  const [allCookies, setAllCookies] = useState<CookieRecord[]>([]);
  const [stores, setStores] = useState<CookieStoreInfo[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string>('all');
  const [activeHost, setActiveHost] = useState<string | null>(null);
  const initializedHostRef = useRef(false);
  const [scopeAllDomains, setScopeAllDomains] = useState<boolean>(false);
  const [includeSubdomains, setIncludeSubdomains] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<CookieFilterMode>('all');
  const [sortMode, setSortMode] = useState<CookieSortMode>('name');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runtimeAvailable, setRuntimeAvailable] = useState<boolean>(hasExtensionRuntime());

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const hasRuntime = hasExtensionRuntime();
      setRuntimeAvailable(hasRuntime);
      const [loadedSettings, loadedStores, tabInfo, rawCookies, loadedUndo] = await Promise.all([
        loadSettings(),
        getAllCookieStores(),
        getActiveTabInfo(),
        getAllCookies({}),
        loadUndoStack(),
      ]);

      setSettings(loadedSettings);
      setStores(loadedStores);
      setUndoStack(loadedUndo);
      setAllCookies(rawCookies);

      if (!initializedHostRef.current) {
        initializedHostRef.current = true;
        setIncludeSubdomains(loadedSettings.includeSubdomainsByDefault);
        const host = extractInspectableHost(tabInfo?.url);
        setActiveHost(host);
        if (!host) {
          setScopeAllDomains(true);
        }
        if (tabInfo?.cookieStoreId) {
          setActiveStoreId(tabInfo.cookieStoreId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const api = getCookiesApiRaw();
    if (!api?.onChanged) return;
    const listener = () => {
      void getAllCookies({}).then(setAllCookies);
    };
    api.onChanged.addListener(listener);
    return () => {
      api.onChanged.removeListener(listener);
    };
  }, []);

  const scopedCookies = useMemo(() => {
    return allCookies.filter((cookie) => {
      if (activeStoreId !== 'all' && cookie.storeId !== activeStoreId) {
        return false;
      }
      if (scopeAllDomains || !activeHost) {
        return true;
      }
      return domainMatchesHost(cookie.domain, activeHost, includeSubdomains);
    });
  }, [allCookies, activeStoreId, scopeAllDomains, activeHost, includeSubdomains]);

  const filteredCookies = useMemo(
    () => filterAndSortCookies(scopedCookies, searchQuery, filterMode, sortMode),
    [scopedCookies, searchQuery, filterMode, sortMode],
  );

  const health = useMemo(() => computeDomainHealth(scopedCookies), [scopedCookies]);

  const distinctDomains = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCookies) {
      set.add(normalizeDomainHost(c.domain));
    }
    if (activeHost) set.add(activeHost);
    return [...set].filter(Boolean).sort();
  }, [allCookies, activeHost]);

  const currentDomainLocked = useMemo(
    () => !scopeAllDomains && isDomainLocked(activeHost, settings),
    [scopeAllDomains, activeHost, settings],
  );

  const updateSettings = useCallback(async (next: CookiraSettings) => {
    const saved = await saveSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  const toggleDomainLock = useCallback(
    async (host: string | null) => {
      if (!host) return;
      const normalized = normalizeDomainHost(host);
      const exists = settings.lockedDomains.includes(normalized);
      const lockedDomains = exists
        ? settings.lockedDomains.filter((d) => d !== normalized)
        : [...settings.lockedDomains, normalized];
      await updateSettings({ ...settings, lockedDomains });
    },
    [settings, updateSettings],
  );

  const recordUndo = useCallback(async (snapshot: UndoSnapshot) => {
    const nextStack = await pushUndoSnapshot(snapshot);
    setUndoStack(nextStack);
  }, []);

  const saveCookie = useCallback(
    async (draft: CookieDraft) => {
      const res = await saveCookieWithUndo({ draft, allCookies, settings });
      await recordUndo(res.snapshot);
      setAllCookies(res.nextCookies);
      return res.saved;
    },
    [allCookies, recordUndo, settings],
  );

  const deleteCookie = useCallback(
    async (cookie: CookieRecord) => {
      const res = await deleteSingleCookieWithUndo({ cookie, settings });
      await recordUndo(res.snapshot);
      setAllCookies(res.nextCookies);
    },
    [recordUndo, settings],
  );

  const deleteCookiesBatch = useCallback(
    async (targets: CookieRecord[], label: string) => {
      const res = await deleteCookiesBatchWithUndo({ targets, label, activeHost, settings });
      await recordUndo(res.snapshot);
      setSelectedIds(new Set());
      setAllCookies(res.nextCookies);
      return res.removedCount;
    },
    [activeHost, recordUndo, settings],
  );

  const undoLastAction = useCallback(async () => {
    const { popped, remaining } = await popUndoSnapshot();
    if (!popped) return null;
    await restoreUndoSnapshot(popped);
    setUndoStack(remaining);
    const updated = await getAllCookies({});
    setAllCookies(updated);
    return popped;
  }, []);

  const toggleSelectId = useCallback((cookie: CookieRecord) => {
    const id = cookieIdentityId(cookie);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredCookies.map((c) => cookieIdentityId(c))));
  }, [filteredCookies]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCookies = useMemo(
    () => filteredCookies.filter((c) => selectedIds.has(cookieIdentityId(c))),
    [filteredCookies, selectedIds],
  );

  return {
    settings,
    updateSettings,
    allCookies,
    scopedCookies,
    filteredCookies,
    selectedCookies,
    selectedIds,
    toggleSelectId,
    selectAllFiltered,
    clearSelection,
    stores,
    activeStoreId,
    setActiveStoreId,
    activeHost,
    setActiveHost,
    scopeAllDomains,
    setScopeAllDomains,
    includeSubdomains,
    setIncludeSubdomains,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    sortMode,
    setSortMode,
    health,
    distinctDomains,
    currentDomainLocked,
    toggleDomainLock,
    undoStack,
    recordUndo,
    undoLastAction,
    saveCookie,
    deleteCookie,
    deleteCookiesBatch,
    refreshAll,
    loading,
    runtimeAvailable,
    buildDraftForNew: (domain?: string): CookieDraft => ({
      name: '',
      value: '',
      domain: domain || activeHost || 'example.com',
      path: '/',
      secure: true,
      httpOnly: false,
      hostOnly: true,
      session: false,
      expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7,
      sameSite: 'lax',
      storeId: activeStoreId === 'all' ? '0' : activeStoreId,
    }),
    toDraft: cookieRecordToDraft,
  };
}
