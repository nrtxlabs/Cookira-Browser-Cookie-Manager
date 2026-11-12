import React, { useState } from 'react';
import type { CookieRecord, UndoSnapshot } from '../../core/types';
import { CloseIcon } from './Icons';
import { ExportPanel } from './ExportPanel';
import { ImportPanel } from './ImportPanel';

interface ExportImportModalProps {
  initialTab: 'export' | 'import';
  defaultExportFormat: 'json' | 'netscape' | 'header';
  activeHost: string | null;
  scopedCookies: CookieRecord[];
  filteredCookies: CookieRecord[];
  selectedCookies: CookieRecord[];
  allCookies: CookieRecord[];
  onImported: (snapshot: UndoSnapshot, count: number) => Promise<void>;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  initialTab,
  defaultExportFormat,
  activeHost,
  scopedCookies,
  filteredCookies,
  selectedCookies,
  allCookies,
  onImported,
  onNotify,
  onClose,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>(initialTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Export and Import Cookies"
    >
      <div
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto cookira-scroll rounded border p-4 space-y-3"
        style={{
          backgroundColor: 'var(--ck-surface)',
          borderColor: 'var(--ck-border-strong)',
          boxShadow: 'var(--ck-shadow)',
        }}
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--ck-border-subtle)' }}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('export')}
              className="cookira-chip text-xs px-3 py-1 rounded border cursor-pointer"
              style={{
                backgroundColor: tab === 'export' ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
                borderColor: tab === 'export' ? 'var(--ck-border-strong)' : 'var(--ck-border)',
                color: tab === 'export' ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
              }}
            >
              Export Cookies
            </button>
            <button
              type="button"
              onClick={() => setTab('import')}
              className="cookira-chip text-xs px-3 py-1 rounded border cursor-pointer"
              style={{
                backgroundColor: tab === 'import' ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
                borderColor: tab === 'import' ? 'var(--ck-border-strong)' : 'var(--ck-border)',
                color: tab === 'import' ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
              }}
            >
              Import Cookies
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cookira-btn-secondary p-1"
            aria-label="Close modal"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {tab === 'export' ? (
          <ExportPanel
            defaultFormat={defaultExportFormat}
            activeHost={activeHost}
            scopedCookies={scopedCookies}
            filteredCookies={filteredCookies}
            selectedCookies={selectedCookies}
            allCookies={allCookies}
            onNotify={onNotify}
          />
        ) : (
          <ImportPanel
            activeHost={activeHost}
            existingCookies={scopedCookies}
            onImported={onImported}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};
