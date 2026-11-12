import React from 'react';
import type { CookieDraft, CookieRecord, CookiraSettings, UiDensityMode } from '../../core/types';
import type { CookieFilterMode, CookieSortMode } from '../../core/cookieFilterSort';
import { cookieIdentityId } from '../../core/cookieUrl';
import { isCookieExpired } from '../../core/domainHealth';
import { isDomainLocked } from '../../storage/settingsStore';
import { CookieToolbar } from './CookieToolbar';
import { CookieList } from './CookieList';
import { CookieEditorPanel } from './CookieEditorPanel';

interface WorkspaceSplitViewProps {
  uiMode: UiDensityMode;
  isSplitLayout: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  filterMode: CookieFilterMode;
  sortMode: CookieSortMode;
  counts: { all: number; httpOnly: number; secure: number; session: number; expired: number };
  scopedCookies: CookieRecord[];
  filteredCookies: CookieRecord[];
  selectedCookies: CookieRecord[];
  allCookies: CookieRecord[];
  selectedIds: Set<string>;
  selectedKeyId: string | null;
  editingDraft: { draft: CookieDraft; isNew: boolean } | null;
  currentDomainLocked: boolean;
  loading: boolean;
  runtimeAvailable: boolean;
  settings: CookiraSettings;
  onSearchChange: (q: string) => void;
  onFilterChange: (mode: CookieFilterMode) => void;
  onSortChange: (mode: CookieSortMode) => void;
  onAddCookie: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onClearTargets: (targets: CookieRecord[], title: string, label: string) => void;
  onToggleSelectAll: () => void;
  onSelectCookie: (cookie: CookieRecord) => void;
  onToggleCheckbox: (cookie: CookieRecord) => void;
  onCopyText: (label: string, text: string) => void;
  onDeleteCookie: (cookie: CookieRecord) => Promise<void>;
  onSwitchToAllDomains: () => void;
  onCloseEditor: () => void;
  onSaveCookie: (draft: CookieDraft) => Promise<void>;
}

export const WorkspaceSplitView: React.FC<WorkspaceSplitViewProps> = (props) => {
  const showSplitPane = props.isSplitLayout;
  const showListPane = showSplitPane || !props.editingDraft;

  return (
    <div className={showSplitPane ? 'flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0' : 'flex-1 flex flex-col min-h-0'}>
      {showListPane && (
        <div
          className={`${showSplitPane ? 'lg:col-span-5 border-r' : 'flex-1'} flex flex-col min-h-0`}
          style={{ borderColor: 'var(--ck-border-subtle)' }}
        >
          <CookieToolbar
            uiMode={props.uiMode}
            searchInputRef={props.searchInputRef}
            searchQuery={props.searchQuery}
            filterMode={props.filterMode}
            sortMode={props.sortMode}
            counts={props.counts}
            selectedCount={props.selectedCookies.length}
            isLocked={props.currentDomainLocked}
            onSearchChange={props.onSearchChange}
            onFilterChange={props.onFilterChange}
            onSortChange={props.onSortChange}
            onAddCookie={props.onAddCookie}
            onOpenExport={props.onOpenExport}
            onOpenImport={props.onOpenImport}
            onClearExpired={() => {
              const expired = props.scopedCookies.filter((c) => isCookieExpired(c));
              if (expired.length > 0) props.onClearTargets(expired, 'Purge Expired Cookies', 'Purge expired');
            }}
            onClearScope={() => {
              const targets = props.selectedCookies.length > 0 ? props.selectedCookies : props.filteredCookies;
              if (targets.length > 0) props.onClearTargets(targets, 'Clear Cookies', 'Clear cookies');
            }}
            onToggleSelectAll={props.onToggleSelectAll}
          />
          <div className="flex-1 overflow-y-auto cookira-scroll">
            <CookieList
              uiMode={props.uiMode}
              cookies={props.filteredCookies}
              selectedKeyId={props.selectedKeyId}
              selectedIds={props.selectedIds}
              isLocked={props.currentDomainLocked}
              loading={props.loading}
              runtimeAvailable={props.runtimeAvailable}
              onSelectCookie={props.onSelectCookie}
              onToggleCheckbox={props.onToggleCheckbox}
              onCopyValue={(cookie) => props.onCopyText(cookie.name, cookie.value)}
              onDeleteCookie={(cookie) => void props.onDeleteCookie(cookie)}
              onSwitchToAllDomains={props.onSwitchToAllDomains}
            />
          </div>
        </div>
      )}

      {(props.editingDraft || showSplitPane) && (
        <div className={showSplitPane ? 'lg:col-span-7 overflow-y-auto cookira-scroll' : 'flex-1 overflow-y-auto cookira-scroll'}>
          {props.editingDraft ? (
            <CookieEditorPanel
              uiMode={props.uiMode}
              draft={props.editingDraft.draft}
              isNew={props.editingDraft.isNew}
              isLocked={isDomainLocked(props.editingDraft.draft.domain, props.settings)}
              autoDecodeInspector={props.settings.autoDecodeInspector}
              showBackButton={!showSplitPane}
              onBack={props.onCloseEditor}
              onSave={props.onSaveCookie}
              onDelete={
                props.editingDraft.isNew
                  ? undefined
                  : async () => {
                      const match = props.allCookies.find((c) => cookieIdentityId(c) === props.selectedKeyId);
                      if (match) await props.onDeleteCookie(match);
                    }
              }
              onCopyText={props.onCopyText}
            />
          ) : (
            <div className="p-8 text-center space-y-2">
              <div className="cookira-mono text-xs font-semibold">Select a cookie to inspect or edit</div>
              <p className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>
                Click any cookie row on the left to inspect attributes, view decoded JWT/JSON/Base64 values, or click Add to create a new cookie.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
