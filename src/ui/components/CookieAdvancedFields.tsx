import React from 'react';
import type { CookieDraft, SameSiteStatus } from '../../core/types';

interface CookieAdvancedFieldsProps {
  form: CookieDraft;
  onUpdate: (patch: Partial<CookieDraft>, markTouched?: boolean) => void;
}

export const CookieAdvancedFields: React.FC<CookieAdvancedFieldsProps> = ({
  form,
  onUpdate,
}) => {
  return (
    <div
      className="p-2.5 rounded border space-y-2.5"
      style={{
        backgroundColor: 'var(--ck-surface-alt)',
        borderColor: 'var(--ck-border-subtle)',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Path</span>
          <input
            type="text"
            value={form.path}
            onChange={(e) => onUpdate({ path: e.target.value }, true)}
            className="cookira-input cookira-mono text-xs w-full px-2.5 py-1"
            placeholder="/"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>SameSite</span>
          <select
            value={form.sameSite}
            onChange={(e) => onUpdate({ sameSite: e.target.value as SameSiteStatus }, true)}
            className="cookira-input cookira-mono text-xs w-full px-2.5 py-1"
          >
            <option value="lax">Lax</option>
            <option value="strict">Strict</option>
            <option value="no_restriction">None (no_restriction)</option>
            <option value="unspecified">Unspecified</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.httpOnly}
            onChange={(e) => onUpdate({ httpOnly: e.target.checked })}
            className="accent-[var(--ck-accent)]"
          />
          <span>HttpOnly</span>
        </label>
        <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.secure}
            onChange={(e) => onUpdate({ secure: e.target.checked })}
            className="accent-[var(--ck-accent)]"
          />
          <span>Secure</span>
        </label>
        <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer" title="Omit Domain attribute on cookies.set">
          <input
            type="checkbox"
            checked={form.hostOnly}
            onChange={(e) => onUpdate({ hostOnly: e.target.checked })}
            className="accent-[var(--ck-accent)]"
          />
          <span>HostOnly</span>
        </label>
      </div>
    </div>
  );
};
