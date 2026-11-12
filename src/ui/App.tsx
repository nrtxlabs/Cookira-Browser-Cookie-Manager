import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { CookieDraft, CookieRecord, SurfaceMode } from '../core/types';
import { cookieIdentityId } from '../core/cookieUrl';
import { computeCookieFilterCounts } from '../core/cookieFilterSort';
import { useThemeSync } from './hooks/useThemeSync';
import { useIsWideViewport } from './hooks/useIsWideViewport';
import { useCookiesWorkspace } from './hooks/useCookiesWorkspace';
import { useProfiles } from './hooks/useProfiles';
import { useWatcher } from './hooks/useWatcher';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppHeader } from './components/AppHeader';
import { ProfileHealthStrip } from './components/ProfileHealthStrip';
import { LiveWatcherPanel } from './components/LiveWatcherPanel';
import { ToastBanner } from './components/ToastBanner';
import { WorkspaceModals, type ConfirmState } from './components/WorkspaceModals';
import { WorkspaceSplitView } from './components/WorkspaceSplitView';
import { SurfaceTabsBar } from './components/SurfaceTabsBar';

interface AppProps {
  surface: SurfaceMode;
}

export const App: React.FC<AppProps> = ({ surface }) => {
  const ws = useCookiesWorkspace();
  const resolvedTheme = useThemeSync(ws.settings.themeMode);
  const isWideViewport = useIsWideViewport();
  const isSplitLayout = surface !== 'popup' && isWideViewport;
  const watcher = useWatcher(ws.settings.watcherEnabled);
  const profilesApi = useProfiles(async (snapshot) => {
    await ws.recordUndo(snapshot);
    await ws.refreshAll();
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'cookies' | 'watcher'>('cookies');
  const [editingDraft, setEditingDraft] = useState<{ draft: CookieDraft; isNew: boolean } | null>(null);
  const [exportImportModal, setExportImportModal] = useState<'export' | 'import' | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = useCallback((msg: string) => setToastMsg(msg), []);
  const uiMode = ws.settings.uiMode;

  useKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      if (confirmState) setConfirmState(null);
      else if (exportImportModal) setExportImportModal(null);
      else if (profilesOpen) setProfilesOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (!isSplitLayout && editingDraft) setEditingDraft(null);
    },
    onOpenExport: () => setExportImportModal('export'),
    onOpenImport: () => {
      if (!ws.currentDomainLocked) setExportImportModal('import');
    },
    onOpenSettings: () => setSettingsOpen((prev) => !prev),
  });

  const counts = useMemo(() => computeCookieFilterCounts(ws.scopedCookies), [ws.scopedCookies]);
  const selectedKeyId = useMemo(() => {
    if (!editingDraft || editingDraft.isNew || !editingDraft.draft.originalKey) return null;
    return cookieIdentityId(editingDraft.draft.originalKey);
  }, [editingDraft]);

  const handleCopy = useCallback(
    async (label: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify(`Copied ${label} to clipboard`);
      } catch {
        notify('Unable to access clipboard');
      }
    },
    [notify],
  );

  const handleSaveCookie = async (draft: CookieDraft) => {
    await ws.saveCookie(draft);
    notify(`Saved cookie "${draft.name}"`);
    if (!isSplitLayout) {
      setEditingDraft(null);
      return;
    }
    const originalKey = {
      name: draft.name,
      domain: draft.domain,
      path: draft.path,
      storeId: draft.storeId,
      partitionKey: draft.partitionKey,
    };
    setEditingDraft({ draft: { ...draft, originalKey }, isNew: false });
  };

  const handleDeleteCookie = async (cookie: CookieRecord) => {
    try {
      await ws.deleteCookie(cookie);
      if (selectedKeyId === cookieIdentityId(cookie)) setEditingDraft(null);
      notify(`Deleted "${cookie.name}"`);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err));
    }
  };

  const runClearAction = (targets: CookieRecord[], title: string, label: string) => {
    const exec = async () => {
      try {
        const count = await ws.deleteCookiesBatch(targets, label);
        setEditingDraft(null);
        notify(`Removed ${count} cookies`);
      } catch (err) {
        notify(err instanceof Error ? err.message : String(err));
      } finally {
        setConfirmState(null);
      }
    };
    if (!ws.settings.confirmBeforeDelete) return void exec();
    setConfirmState({
      title,
      message: `Delete ${targets.length} cookie(s) from ${ws.scopeAllDomains ? 'visible scopes' : ws.activeHost ?? 'current scope'}? An Undo snapshot will be captured.`,
      confirmLabel: `Delete (${targets.length})`,
      action: exec,
    });
  };

  const handleUndo = async () => {
    try {
      const restored = await ws.undoLastAction();
      if (restored) notify(`Undone: ${restored.label}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err));
    }
  };

  const domainProfileCount = useMemo(() => {
    if (!ws.activeHost || ws.scopeAllDomains) return profilesApi.profiles.length;
    return profilesApi.profiles.filter((p) => p.domain === ws.activeHost).length;
  }, [profilesApi.profiles, ws.activeHost, ws.scopeAllDomains]);

  return (
    <div
      className={`min-h-screen flex flex-col ${surface === 'dashboard' ? 'max-w-[1440px] mx-auto border-x' : ''}`}
      style={{
        backgroundColor: 'var(--ck-bg)',
        borderColor: 'var(--ck-border-subtle)',
        color: 'var(--ck-text)',
      }}
    >
      <AppHeader
        surface={surface}
        uiMode={uiMode}
        activeHost={ws.activeHost}
        distinctDomains={ws.distinctDomains}
        scopeAllDomains={ws.scopeAllDomains}
        includeSubdomains={ws.includeSubdomains}
        stores={ws.stores}
        activeStoreId={ws.activeStoreId}
        health={ws.health}
        onChangeUiMode={(nextMode) => {
          if (nextMode === 'simple') setActiveTab('cookies');
          void ws.updateSettings({ ...ws.settings, uiMode: nextMode });
        }}
        onSelectHost={(host) => {
          ws.setActiveHost(host);
          setEditingDraft(null);
        }}
        onToggleAllDomains={(all) => {
          ws.setScopeAllDomains(all);
          setEditingDraft(null);
        }}
        onToggleSubdomains={ws.setIncludeSubdomains}
        onSelectStore={ws.setActiveStoreId}
        onRefresh={() => void ws.refreshAll()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {uiMode === 'advanced' && (
        <>
          <ProfileHealthStrip
            activeHost={ws.activeHost}
            scopeAllDomains={ws.scopeAllDomains}
            health={ws.health}
            profileCount={domainProfileCount}
            isLocked={ws.currentDomainLocked}
            onToggleLock={() => void ws.toggleDomainLock(ws.activeHost)}
            onOpenProfiles={() => setProfilesOpen(true)}
          />
          <SurfaceTabsBar
            activeTab={activeTab}
            cookieCount={ws.filteredCookies.length}
            watcherCount={watcher.events.length}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'watcher') void watcher.refreshWatcher();
            }}
          />
        </>
      )}

      <main className="flex-1 min-h-0 flex flex-col">
        {uiMode === 'advanced' && activeTab === 'watcher' ? (
          <LiveWatcherPanel
            events={watcher.events}
            enabled={ws.settings.watcherEnabled}
            onToggleEnabled={(next) => void ws.updateSettings({ ...ws.settings, watcherEnabled: next })}
            onClear={() => void watcher.clearLogs()}
          />
        ) : (
          <WorkspaceSplitView
            uiMode={uiMode}
            isSplitLayout={isSplitLayout}
            searchInputRef={searchInputRef}
            searchQuery={ws.searchQuery}
            filterMode={ws.filterMode}
            sortMode={ws.sortMode}
            counts={counts}
            scopedCookies={ws.scopedCookies}
            filteredCookies={ws.filteredCookies}
            selectedCookies={ws.selectedCookies}
            allCookies={ws.allCookies}
            selectedIds={ws.selectedIds}
            selectedKeyId={selectedKeyId}
            editingDraft={editingDraft}
            currentDomainLocked={ws.currentDomainLocked}
            loading={ws.loading}
            runtimeAvailable={ws.runtimeAvailable}
            settings={ws.settings}
            onSearchChange={ws.setSearchQuery}
            onFilterChange={ws.setFilterMode}
            onSortChange={ws.setSortMode}
            onAddCookie={() => setEditingDraft({ draft: ws.buildDraftForNew(), isNew: true })}
            onOpenExport={() => setExportImportModal('export')}
            onOpenImport={() => setExportImportModal('import')}
            onClearTargets={runClearAction}
            onToggleSelectAll={() => {
              if (ws.selectedCookies.length > 0) ws.clearSelection();
              else ws.selectAllFiltered();
            }}
            onSelectCookie={(cookie) => setEditingDraft({ draft: ws.toDraft(cookie), isNew: false })}
            onToggleCheckbox={ws.toggleSelectId}
            onCopyText={(label, txt) => void handleCopy(label, txt)}
            onDeleteCookie={handleDeleteCookie}
            onSwitchToAllDomains={() => ws.setScopeAllDomains(true)}
            onCloseEditor={() => setEditingDraft(null)}
            onSaveCookie={handleSaveCookie}
          />
        )}
      </main>

      <ToastBanner
        message={toastMsg}
        canUndo={ws.undoStack.length > 0}
        undoLabel={ws.undoStack[0]?.label}
        onUndo={() => void handleUndo()}
        onDismiss={() => setToastMsg(null)}
      />

      <WorkspaceModals
        exportImportModal={exportImportModal}
        profilesOpen={profilesOpen}
        settingsOpen={settingsOpen}
        confirmState={confirmState}
        settings={ws.settings}
        resolvedTheme={resolvedTheme}
        activeHost={ws.activeHost}
        includeSubdomains={ws.includeSubdomains}
        currentDomainLocked={ws.currentDomainLocked}
        scopedCookies={ws.scopedCookies}
        filteredCookies={ws.filteredCookies}
        selectedCookies={ws.selectedCookies}
        allCookies={ws.allCookies}
        stores={ws.stores}
        profiles={profilesApi.profiles}
        onCloseExportImport={() => setExportImportModal(null)}
        onCloseProfiles={() => setProfilesOpen(false)}
        onCloseSettings={() => setSettingsOpen(false)}
        onCancelConfirm={() => setConfirmState(null)}
        onImported={async (snapshot, count) => {
          await ws.recordUndo(snapshot);
          await ws.refreshAll();
          notify(`Imported ${count} cookies`);
        }}
        onSaveProfile={async (name) => {
          if (!ws.activeHost) return;
          await profilesApi.saveSnapshotProfile({ name, domain: ws.activeHost, includeSubdomains: ws.includeSubdomains, cookies: ws.scopedCookies });
          notify(`Saved profile "${name}"`);
        }}
        onSwitchProfile={async (profile) => {
          const res = await profilesApi.applyProfile(profile);
          notify(res.rolledBack ? `Failed to apply profile "${profile.name}"; rolled back safely` : `Switched to "${profile.name}" (${res.applied} cookies)`);
        }}
        onRenameProfile={profilesApi.renameSavedProfile}
        onDeleteProfile={profilesApi.removeSavedProfile}
        onSaveSettings={async (next) => { await ws.updateSettings(next); }}
        onNotify={notify}
      />
    </div>
  );
};
