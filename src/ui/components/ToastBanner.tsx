import React from 'react';
import { UndoIcon } from './Icons';

interface ToastBannerProps {
  message: string | null;
  canUndo: boolean;
  undoLabel?: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  canUndo,
  undoLabel,
  onUndo,
  onDismiss,
}) => {
  if (!message && !canUndo) return null;

  return (
    <div
      className="px-3 py-1.5 border-t flex items-center justify-between gap-2 text-xs"
      style={{
        backgroundColor: 'var(--ck-surface-alt)',
        borderColor: 'var(--ck-border)',
      }}
    >
      <span className="cookira-mono truncate" style={{ color: 'var(--ck-accent)' }}>
        {message ?? undoLabel ?? 'Action recorded'}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {canUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="cookira-btn-secondary text-xs px-2 py-0.5 flex items-center gap-1"
            title={undoLabel}
          >
            <UndoIcon size={12} />
            <span className="cookira-chip">Undo</span>
          </button>
        )}
        {message && (
          <button
            type="button"
            onClick={onDismiss}
            className="cookira-mono text-xs px-1.5 py-0.5 cursor-pointer"
            style={{ color: 'var(--ck-text-muted)' }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
