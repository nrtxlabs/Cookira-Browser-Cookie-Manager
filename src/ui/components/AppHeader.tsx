import React from 'react';
import type { CookieStoreInfo, SurfaceMode, UiDensityMode } from '../../core/types';
import type { DomainHealthSummary } from '../../core/domainHealth';
import { formatByteSize } from '../../core/domainHealth';
import {
  getExtensionVersion,
  openDashboardTab,
  openSidePanelView,
  resolveStoreLabel,
} from '../../core/browserApi';
import { CookieIcon, ExpandIcon, PanelIcon, RefreshIcon, SettingsIcon } from './Icons';

interface AppHeaderProps {
  surface: SurfaceMode;
  uiMode: UiDensityMode;
  activeHost: string | null;
  distinctDomains: string[];
  scopeAllDomains: boolean;
  includeSubdomains: boolean;
  stores: CookieStoreInfo[];
  activeStoreId: string;
  health: DomainHealthSummary;
  onChangeUiMode: (mode: UiDensityMode) => void;
  onSelectHost: (host: string | null) => void;
  onToggleAllDomains: (all: boolean) => void;
  onToggleSubdomains: (val: boolean) => void;
  onSelectStore: (storeId: string) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  surface,
  uiMode,
  activeHost,
  distinctDomains,
  scopeAllDomains,
  includeSubdomains,
  stores,
  activeStoreId,
  health,
  onChangeUiMode,
  onSelectHost,
  onToggleAllDomains,
  onToggleSubdomains,
  onSelectStore,
  onRefresh,
  onOpenSettings,
}) => {
  return (
    <header
      className="px-3 py-2 border-b space-y-1.5"
      style={{
        backgroundColor: 'var(--ck-surface)',
        borderColor: 'var(--ck-border)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="p-1 rounded border shrink-0"
            style={{
              backgroundColor: 'var(--ck-accent-soft)',
              borderColor: 'var(--ck-border-strong)',
              color: 'var(--ck-accent)',
            }}
          >
            <CookieIcon size={14} />
          </span>
          <span
            className="cookira-mono text-xs font-bold tracking-wider uppercase truncate"
            title={`Cookira v${getExtensionVersion()}`}
          >
            COOKIRA
          </span>

          {/* Simple / Advanced Mode Toggle */}
          <div
            className="inline-flex rounded border p-0.5 shrink-0"
            style={{
              backgroundColor: 'var(--ck-surface-alt)',
              borderColor: 'var(--ck-border-subtle)',
            }}
            role="group"
            aria-label="Interface mode"
          >
            {(['simple', 'advanced'] as const).map((mode) => {
              const active = uiMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeUiMode(mode)}
                  className="cookira-chip cookira-mono text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--ck-accent)' : 'transparent',
                    color: active ? 'var(--ck-accent-fg)' : 'var(--ck-text-muted)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {mode === 'simple' ? 'Simple' : 'Advanced'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            className="cookira-btn-secondary p-1.5"
            title="Refresh cookies"
            aria-label="Refresh cookies"
          >
            <RefreshIcon size={13} />
          </button>
          {surface === 'popup' && (
            <button
              type="button"
              onClick={() => void openSidePanelView()}
              className="cookira-btn-secondary p-1.5"
              title="Open Side Panel"
              aria-label="Open Side Panel"
            >
              <PanelIcon size={13} />
            </button>
          )}
          {surface !== 'dashboard' && (
            <button
              type="button"
              onClick={() => void openDashboardTab()}
              className="cookira-btn-secondary p-1.5"
              title="Open Full Studio Tab"
              aria-label="Open Full Studio Tab"
            >
              <ExpandIcon size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="cookira-btn-secondary p-1.5"
            title="Settings (Alt+S)"
            aria-label="Open Settings"
          >
            <SettingsIcon size={13} />
          </button>
        </div>
      </div>

      {/* Domain & Compact Stats Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Target domain scope"
          value={scopeAllDomains ? '__ALL__' : activeHost ?? '__ALL__'}
          onChange={(e) => {
            if (e.target.value === '__ALL__') {
              onToggleAllDomains(true);
            } else {
              onToggleAllDomains(false);
              onSelectHost(e.target.value);
            }
          }}
          className="cookira-input cookira-mono text-xs px-2 py-1 flex-1 min-w-[130px]"
        >
          <option value="__ALL__">All Domains ({distinctDomains.length})</option>
          {distinctDomains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {!scopeAllDomains && activeHost && (
          <button
            type="button"
            onClick={() => onToggleSubdomains(!includeSubdomains)}
            className="cookira-chip cookira-mono text-xs px-2 py-1 rounded border cursor-pointer"
            style={{
              backgroundColor: includeSubdomains ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
              borderColor: includeSubdomains ? 'var(--ck-border-strong)' : 'var(--ck-border)',
              color: includeSubdomains ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
            }}
            title="Include parent & subdomain cookies"
          >
            *.Sub
          </button>
        )}

        {uiMode === 'simple' && (
          <span
            className="cookira-chip cookira-mono text-xs px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--ck-surface-alt)',
              borderColor: 'var(--ck-border-subtle)',
              color: 'var(--ck-text-muted)',
            }}
            title="Cookie count & estimated header size"
          >
            {health.totalCount} · {formatByteSize(health.headerBytes)}
          </span>
        )}

        {uiMode === 'advanced' && stores.length > 1 && (
          <select
            aria-label="Cookie store"
            value={activeStoreId}
            onChange={(e) => onSelectStore(e.target.value)}
            className="cookira-input cookira-mono text-xs px-2 py-1"
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label ?? resolveStoreLabel(s.id, s.incognito)}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
};
