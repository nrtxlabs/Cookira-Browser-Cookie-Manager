import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CookieDraft, UiDensityMode } from '../../core/types';
import { validateCookieDraft } from '../../core/cookieRules';
import { inspectCookieValue } from '../../core/valueInspector';
import { BackIcon, CopyIcon, TrashIcon } from './Icons';
import { CookieExpiryFields } from './CookieExpiryFields';
import { CookieAdvancedFields } from './CookieAdvancedFields';
import { SecurityNotice } from './SecurityNotice';

interface CookieEditorPanelProps {
  uiMode: UiDensityMode;
  draft: CookieDraft;
  isNew: boolean;
  isLocked: boolean;
  autoDecodeInspector: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onSave: (draft: CookieDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCopyText: (label: string, text: string) => void;
}

export const CookieEditorPanel: React.FC<CookieEditorPanelProps> = ({
  uiMode,
  draft: initialDraft,
  isNew,
  isLocked,
  autoDecodeInspector,
  showBackButton,
  onBack,
  onSave,
  onDelete,
  onCopyText,
}) => {
  const [form, setForm] = useState<CookieDraft>(initialDraft);
  const [showAdvancedFields, setShowAdvancedFields] = useState<boolean>(uiMode === 'advanced');
  const [touched, setTouched] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setForm(initialDraft);
    setTouched(false);
    setSubmitted(false);
    setSubmitError(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
    formRef.current?.scrollIntoView({ block: 'start' });
    if (isNew) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [initialDraft, isNew]);

  useEffect(() => {
    if (uiMode === 'advanced') setShowAdvancedFields(true);
  }, [uiMode]);

  const allErrors = useMemo(() => validateCookieDraft(form), [form]);
  const visibleErrors = useMemo(() => {
    if (touched || submitted) return allErrors;
    return allErrors.filter((err) => err !== 'Cookie name is required.');
  }, [allErrors, touched, submitted]);

  const valueInsight = useMemo(
    () => (autoDecodeInspector ? inspectCookieValue(form.value) : null),
    [autoDecodeInspector, form.value],
  );

  const applyExpiryPreset = (secondsToAdd: number | null) => {
    setTouched(true);
    setForm((prev) =>
      secondsToAdd === null
        ? { ...prev, session: true, expirationDate: undefined }
        : { ...prev, session: false, expirationDate: Math.floor(Date.now() / 1000) + secondsToAdd },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (allErrors.length > 0 || isLocked) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await onSave(form);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={(e) => void handleSubmit(e)} className="p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--ck-border-subtle)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton && onBack && (
            <button type="button" onClick={onBack} className="cookira-btn-secondary px-2 py-1 text-xs flex items-center gap-1">
              <BackIcon size={13} />
              <span className="cookira-chip">List</span>
            </button>
          )}
          <span className="cookira-mono text-xs font-bold uppercase truncate">
            {isNew ? 'New Cookie' : `Edit: ${form.name || 'Cookie'}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCopyText('Value', form.value)}
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <CopyIcon size={12} />
            <span className="cookira-chip">Copy</span>
          </button>
          {uiMode === 'advanced' && (
            <button
              type="button"
              onClick={() => onCopyText('Cookie Header', `${form.name}=${form.value}`)}
              className="cookira-btn-secondary text-xs px-2 py-1"
            >
              Header
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Name</span>
          <input
            ref={nameInputRef}
            type="text"
            value={form.name}
            onChange={(e) => {
              setTouched(true);
              setForm((p) => ({ ...p, name: e.target.value }));
            }}
            className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
            placeholder="session_token"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Domain</span>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => {
              setTouched(true);
              setForm((p) => ({ ...p, domain: e.target.value }));
            }}
            className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
            placeholder="example.com"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Value</span>
        <textarea
          rows={3}
          value={form.value}
          onChange={(e) => {
            setTouched(true);
            setForm((p) => ({ ...p, value: e.target.value }));
          }}
          className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5 resize-y"
          placeholder="Cookie payload..."
        />
      </label>

      {valueInsight && valueInsight.kind !== 'raw' && (
        <div
          className="p-2 rounded border space-y-1"
          style={{
            backgroundColor: 'var(--ck-surface-alt)',
            borderColor: 'var(--ck-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Smart Value Inspector</span>
            <span
              className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--ck-accent-soft)',
                borderColor: 'var(--ck-border-strong)',
                color: 'var(--ck-accent)',
              }}
            >
              {valueInsight.label}
            </span>
          </div>
          <pre
            className="cookira-mono text-xs whitespace-pre-wrap break-all max-h-32 overflow-auto cookira-scroll m-0"
            style={{ color: 'var(--ck-text-muted)' }}
          >
            {valueInsight.formatted}
          </pre>
        </div>
      )}

      <CookieExpiryFields
        session={form.session}
        expirationDate={form.expirationDate}
        onApplyPreset={applyExpiryPreset}
        onChangeTimestamp={(epochSec) => {
          setTouched(true);
          setForm((p) => ({ ...p, expirationDate: epochSec }));
        }}
      />

      {/* Collapsible Advanced Attributes in Simple Mode */}
      {uiMode === 'simple' && (
        <button
          type="button"
          onClick={() => setShowAdvancedFields((prev) => !prev)}
          className="cookira-btn-secondary cookira-mono text-xs w-full py-1 px-2.5 text-left flex items-center justify-between"
        >
          <span>Advanced Attributes (Path, SameSite, Flags)</span>
          <span>{showAdvancedFields ? 'Hide' : 'Show'}</span>
        </button>
      )}

      {(uiMode === 'advanced' || showAdvancedFields) && (
        <CookieAdvancedFields
          form={form}
          onUpdate={(patch, markTouched) => {
            if (markTouched) setTouched(true);
            setForm((p) => ({ ...p, ...patch }));
          }}
        />
      )}

      <SecurityNotice variant="editor" compact />

      {(visibleErrors.length > 0 || submitError) && (
        <div
          className="p-2 rounded border text-xs space-y-1"
          style={{
            backgroundColor: 'var(--ck-danger-soft)',
            borderColor: 'var(--ck-danger)',
            color: 'var(--ck-danger)',
          }}
        >
          {visibleErrors.map((err) => (
            <div key={err}>{err}</div>
          ))}
          {submitError && <div>{submitError}</div>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--ck-border-subtle)' }}>
        {!isNew && onDelete ? (
          <button
            type="button"
            disabled={isLocked || saving}
            onClick={() => void onDelete()}
            className="cookira-btn-danger text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <TrashIcon size={13} />
            <span className="cookira-chip">Delete</span>
          </button>
        ) : (
          <span />
        )}

        <button
          type="submit"
          disabled={isLocked || saving || (touched && allErrors.length > 0)}
          className="cookira-btn-primary text-xs px-4 py-1.5"
        >
          {saving ? 'Saving...' : isLocked ? 'Domain Locked' : isNew ? 'Create Cookie' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};
