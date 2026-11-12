import React from 'react';
import type { ImportPreviewItem } from '../../core/types';

interface ImportDiffPreviewProps {
  items: ImportPreviewItem[];
  summary: {
    added: number;
    overwrite: number;
    invalid: number;
  };
}

export const ImportDiffPreview: React.FC<ImportDiffPreviewProps> = ({ items, summary }) => {
  if (items.length === 0) return null;

  return (
    <div
      className="p-2.5 rounded border space-y-2"
      style={{
        backgroundColor: 'var(--ck-surface-alt)',
        borderColor: 'var(--ck-border)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs cookira-mono">
        <span className="font-semibold">Pre-Import Diff</span>
        <div className="flex items-center gap-2">
          <span className="cookira-chip" style={{ color: 'var(--ck-success)' }}>+{summary.added} New</span>
          <span className="cookira-chip" style={{ color: 'var(--ck-warn)' }}>~{summary.overwrite} Overwrite</span>
          {summary.invalid > 0 && (
            <span className="cookira-chip" style={{ color: 'var(--ck-danger)' }}>!{summary.invalid} Invalid</span>
          )}
        </div>
      </div>

      <div className="max-h-28 overflow-auto cookira-scroll space-y-1">
        {items.slice(0, 12).map((item) => (
          <div key={`${item.index}-${item.draft.name}`} className="flex items-center justify-between gap-2 text-xs cookira-mono">
            <span className="truncate">{item.draft.name || '(unnamed)'} @ {item.draft.domain}</span>
            <span
              className="cookira-chip"
              style={{
                color:
                  item.status === 'invalid'
                    ? 'var(--ck-danger)'
                    : item.status === 'overwrite'
                      ? 'var(--ck-warn)'
                      : 'var(--ck-success)',
              }}
            >
              {item.status === 'invalid' ? item.errors[0] : item.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
