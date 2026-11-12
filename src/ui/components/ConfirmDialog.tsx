import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded border p-4 space-y-3"
        style={{
          backgroundColor: 'var(--ck-surface)',
          borderColor: 'var(--ck-danger)',
          boxShadow: 'var(--ck-shadow)',
        }}
      >
        <div className="cookira-mono text-xs font-bold uppercase" style={{ color: 'var(--ck-danger)' }}>
          {title}
        </div>
        <p className="text-xs leading-relaxed m-0">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="cookira-btn-secondary text-xs px-3 py-1.5">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="cookira-btn-danger text-xs px-3 py-1.5">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
