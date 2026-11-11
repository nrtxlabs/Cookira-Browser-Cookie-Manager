import React from 'react';
import type { UiDensityMode } from '../../core/types';
import type { CookieFilterMode, CookieSortMode } from '../../core/cookieFilterSort';
import { DownloadIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon } from './Icons';

interface CookieToolbarProps {
  uiMode: UiDensityMode;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  filterMode: CookieFilterMode;
  sortMode: CookieSortMode;
  counts: {
    all: number;
    httpOnly: number;
    secure: number;
    session: number;
    expired: number;
  };
  selectedCount: number;
  isLocked: boolean;
  onSearchChange: (q: string) => void;
  onFilterChange: (mode: CookieFilterMode) => void;
  onSortChange: (mode: CookieSortMode) => void;
  onAddCookie: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onClearExpired: () => void;
  onClearScope: () => void;
  onToggleSelectAll: () => void;
}

export const CookieToolbar: React.FC<CookieToolbarProps> = ({
  uiMode,
  searchInputRef,
  searchQuery,
  filterMode,
  sortMode,
  counts,
  selectedCount,
  isLocked,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onAddCookie,
  onOpenExport,
  onOpenImport,
  onClearExpired,
  onClearScope,
  onToggleSelectAll,
}) => {
  const filters: Array<{ id: CookieFilterMode; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'httpOnly', label: 'HttpOnly', count: counts.httpOnly },
    { id: 'secure', label: 'Secure', count: counts.secure },
    { id: 'session', label: 'Session', count: counts.session },
    { id: 'expired', label: 'Expired', count: counts.expired },
  ];

  return (
    <div
      className="px-3 py-2 border-b space-y-2"
      style={{
        backgroundColor: 'var(--ck-surface)',
        borderColor: 'var(--ck-border-subtle)',
      }}
    >
      {/* Search (+ Sort in Advanced) */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--ck-text-muted)' }}
          >
            <SearchIcon size={13} />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={uiMode === 'simple' ? 'Search cookies... (/)' : 'Search name, value, domain... (/)'}
            aria-label="Search cookies"
            className="cookira-input cookira-mono text-xs w-full pl-8 pr-2.5 py-1"
          />
        </div>
        {uiMode === 'advanced' && (
          <select
            aria-label="Sort cookies"
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as CookieSortMode)}
            className="cookira-input text-xs px-2 py-1"
          >
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="expiry">Sort: Expiry</option>
          </select>
        )}
      </div>

      {/* Filter Chips (Advanced only, wrap cleanly with zero horizontal scrollbar) */}
      {uiMode === 'advanced' && (
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((f) => {
            const active = filterMode === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className="cookira-chip cookira-mono text-[11px] px-2 py-0.5 rounded border cursor-pointer transition-colors"
                style={{
                  backgroundColor: active ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
                  borderColor: active ? 'var(--ck-border-strong)' : 'var(--ck-border-subtle)',
                  color: active ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
                }}
              >
                {f.label} ({f.count})
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddCookie}
            disabled={isLocked}
            className="cookira-btn-primary text-xs px-2.5 py-1 flex items-center gap-1"
          >
            <PlusIcon size={13} />
            <span className="cookira-chip">Add</span>
          </button>
          <button
            type="button"
            onClick={onOpenExport}
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
            title="Export cookies (Ctrl+E)"
          >
            <DownloadIcon size={13} />
            <span className="cookira-chip">Export</span>
          </button>
          <button
            type="button"
            onClick={onOpenImport}
            disabled={isLocked}
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
            title="Import cookies (Ctrl+I)"
          >
            <UploadIcon size={13} />
            <span className="cookira-chip">Import</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {uiMode === 'advanced' && (
            <>
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="cookira-btn-secondary text-xs px-2 py-1"
              >
                {selectedCount > 0 ? `Selected (${selectedCount})` : 'Select All'}
              </button>
              {counts.expired > 0 && (
                <button
                  type="button"
                  onClick={onClearExpired}
                  disabled={isLocked}
                  className="cookira-btn-secondary text-xs px-2 py-1"
                  title="Delete only expired cookies"
                >
                  Purge Expired
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClearScope}
            disabled={isLocked || counts.all === 0}
            className="cookira-btn-danger text-xs px-2 py-1 flex items-center gap-1"
            title={selectedCount > 0 ? 'Delete selected cookies' : 'Clear visible cookies'}
          >
            <TrashIcon size={12} />
            <span className="cookira-chip">{selectedCount > 0 ? `Del (${selectedCount})` : 'Clear'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
