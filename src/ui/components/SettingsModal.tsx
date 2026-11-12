import React, { useEffect, useState } from 'react';
import type {
  CookieRecord,
  CookieStoreInfo,
  CookiraSettings,
  DefaultExportFormat,
  ThemeMode,
  UiDensityMode,
} from '../../core/types';
import { getStorageBytesInUse } from '../../core/browserApi';
import { formatByteSize } from '../../core/domainHealth';
import { exportSettingsJson, parseSettingsBackupJson } from '../../storage/settingsStore';
import { AutoCleanSection } from './AutoCleanSection';
import { CloseIcon, SettingsIcon } from './Icons';

interface SettingsModalProps {
  settings: CookiraSettings;
  resolvedTheme: 'dark' | 'light';
  profileCount: number;
  stores: CookieStoreInfo[];
  allCookies: CookieRecord[];
  onSaveSettings: (next: CookiraSettings) => Promise<void>;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  resolvedTheme,
  profileCount,
  stores,
  allCookies,
  onSaveSettings,
  onNotify,
  onClose,
}) => {
  const [draft, setDraft] = useState<CookiraSettings>(settings);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    void getStorageBytesInUse().then(setStorageBytes);
  }, []);

  const persist = async (next: CookiraSettings) => {
    setDraft(next);
    await onSaveSettings(next);
  };

  const handleExportConfig = () => {
    const json = exportSettingsJson(draft);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookira-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Settings backup exported.');
  };

  const handleRestoreConfig = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const restored = parseSettingsBackupJson(text);
      await persist(restored);
      onNotify('Settings restored from backup.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const hasIncognitoStore = stores.some((s) => s.incognito);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Cookira Settings"
    >
      <div
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto cookira-scroll rounded border p-4 space-y-4"
        style={{
          backgroundColor: 'var(--ck-surface)',
          borderColor: 'var(--ck-border-strong)',
          boxShadow: 'var(--ck-shadow)',
        }}
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--ck-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <SettingsIcon size={15} />
            <span className="cookira-mono text-xs font-bold uppercase">Cookira Settings &amp; Diagnostics</span>
          </div>
          <button type="button" onClick={onClose} className="cookira-btn-secondary p-1" aria-label="Close settings">
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Theme Sync Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="cookira-mono text-xs font-semibold uppercase">Appearance &amp; Browser Theme Sync</span>
            <span
              className="cookira-chip cookira-mono text-[11px] px-2 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--ck-accent-soft)',
                borderColor: 'var(--ck-border-strong)',
                color: 'var(--ck-accent)',
              }}
            >
              Active: {resolvedTheme === 'dark' ? 'Dark Neon' : 'Light Ink'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'system', label: 'System (Auto)' },
                { id: 'dark', label: 'Dark Neon' },
                { id: 'light', label: 'Light Ink' },
              ] as Array<{ id: ThemeMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => void persist({ ...draft, themeMode: opt.id })}
                className="cookira-chip text-xs py-1.5 px-2 rounded border cursor-pointer"
                style={{
                  backgroundColor: draft.themeMode === opt.id ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
                  borderColor: draft.themeMode === opt.id ? 'var(--ck-border-strong)' : 'var(--ck-border)',
                  color: draft.themeMode === opt.id ? 'var(--ck-accent)' : 'var(--ck-text)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* General Preferences */}
        <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--ck-border-subtle)' }}>
          <span className="cookira-mono text-xs font-semibold uppercase">Workspace Preferences</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'simple', label: 'Simple Mode (Clean & Fast)' },
                { id: 'advanced', label: 'Advanced Mode (Full Dev Tools)' },
              ] as Array<{ id: UiDensityMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => void persist({ ...draft, uiMode: opt.id })}
                className="cookira-chip text-xs py-1.5 px-2 rounded border cursor-pointer"
                style={{
                  backgroundColor: draft.uiMode === opt.id ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
                  borderColor: draft.uiMode === opt.id ? 'var(--ck-border-strong)' : 'var(--ck-border)',
                  color: draft.uiMode === opt.id ? 'var(--ck-accent)' : 'var(--ck-text)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>Default Export Format</span>
              <select
                value={draft.defaultExportFormat}
                onChange={(e) =>
                  void persist({
                    ...draft,
                    defaultExportFormat: e.target.value as DefaultExportFormat,
                  })
                }
                className="cookira-input text-xs w-full px-2.5 py-1.5"
              >
                <option value="json">JSON (Standard / Playwright)</option>
                <option value="netscape">Netscape .txt</option>
                <option value="header">HTTP Cookie: Header</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>Watcher Buffer Max Events</span>
              <input
                type="number"
                min={20}
                max={1000}
                value={draft.watcherMaxEvents}
                onChange={(e) =>
                  void persist({
                    ...draft,
                    watcherMaxEvents: Number(e.target.value) || 200,
                  })
                }
                className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={draft.includeSubdomainsByDefault}
                onChange={(e) => void persist({ ...draft, includeSubdomainsByDefault: e.target.checked })}
                className="accent-[var(--ck-accent)]"
              />
              <span>Include Subdomains by default</span>
            </label>
            <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={draft.confirmBeforeDelete}
                onChange={(e) => void persist({ ...draft, confirmBeforeDelete: e.target.checked })}
                className="accent-[var(--ck-accent)]"
              />
              <span>Confirm before bulk clear</span>
            </label>
            <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoDecodeInspector}
                onChange={(e) => void persist({ ...draft, autoDecodeInspector: e.target.checked })}
                className="accent-[var(--ck-accent)]"
              />
              <span>JWT / Base64 / URL Inspector</span>
            </label>
          </div>
        </section>

        <AutoCleanSection draft={draft} allCookies={allCookies} onPersist={persist} />

        {/* Backup & Diagnostics */}
        <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--ck-border-subtle)' }}>
          <span className="cookira-mono text-xs font-semibold uppercase">Config Backup &amp; Storage Health</span>
          <div className="p-2.5 rounded border text-xs cookira-mono grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ backgroundColor: 'var(--ck-surface-alt)', borderColor: 'var(--ck-border-subtle)' }}>
            <div>Profiles: {profileCount}</div>
            <div>Locked: {draft.lockedDomains.length}</div>
            <div>Storage: {storageBytes === null ? 'N/A' : formatByteSize(storageBytes)}</div>
            <div>Stores: {stores.length}</div>
            <div>Incognito: {hasIncognitoStore ? 'Allowed' : 'Restricted'}</div>
            <div>Cookies: {allCookies.length}</div>
          </div>

          {error && (
            <div className="p-2 rounded border text-xs" style={{ backgroundColor: 'var(--ck-danger-soft)', borderColor: 'var(--ck-danger)', color: 'var(--ck-danger)' }}>
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleExportConfig} className="cookira-btn-secondary text-xs px-3 py-1.5">
                Export Config JSON
              </button>
              <label className="cookira-btn-secondary text-xs px-3 py-1.5 cursor-pointer">
                <span>Restore Config</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleRestoreConfig(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <button type="button" onClick={onClose} className="cookira-btn-primary text-xs px-4 py-1.5">
              Done
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
