import React, { useEffect, useMemo, useState } from 'react';
import type { CookieDraft, CookieRecord, ImportMode, UndoSnapshot } from '../../core/types';
import { detectImportFormat, parseAnyCookiePayload } from '../../codecs';
import { applyCookieImportBatch, buildImportPreview } from '../../core/cookieTransaction';
import { cookieRecordToDraft } from '../../core/cookieRules';
import { decryptCookiesVault } from '../../crypto/encryptedVault';
import { UploadIcon } from './Icons';
import { ImportDiffPreview } from './ImportDiffPreview';
import { SecurityNotice } from './SecurityNotice';

interface ImportPanelProps {
  activeHost: string | null;
  existingCookies: CookieRecord[];
  onImported: (snapshot: UndoSnapshot, count: number) => Promise<void>;
  onClose: () => void;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({
  activeHost,
  existingCookies,
  onImported,
  onClose,
}) => {
  const [rawText, setRawText] = useState('');
  const [fallbackDomain, setFallbackDomain] = useState(activeHost ?? '');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [passphrase, setPassphrase] = useState('');
  const [decryptedDrafts, setDecryptedDrafts] = useState<CookieDraft[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setPassphrase('');
    };
  }, []);

  const detectedFormat = useMemo(() => detectImportFormat(rawText), [rawText]);

  const parsedState = useMemo(() => {
    if (!rawText.trim()) {
      return { drafts: [] as CookieDraft[], parseError: null as string | null };
    }
    if (detectedFormat === 'encrypted') {
      return {
        drafts: decryptedDrafts ?? [],
        parseError: decryptedDrafts ? null : 'Encrypted vault detected — enter passphrase to unlock.',
      };
    }
    try {
      const parsed = parseAnyCookiePayload({
        rawText,
        fallbackDomain,
        secureDefault: true,
      });
      return { drafts: parsed.drafts, parseError: null };
    } catch (err) {
      return {
        drafts: [] as CookieDraft[],
        parseError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [rawText, detectedFormat, decryptedDrafts, fallbackDomain]);

  const previewItems = useMemo(
    () => buildImportPreview(parsedState.drafts, existingCookies),
    [parsedState.drafts, existingCookies],
  );

  const summary = useMemo(() => {
    let added = 0;
    let overwrite = 0;
    let invalid = 0;
    for (const item of previewItems) {
      if (item.status === 'new') added += 1;
      else if (item.status === 'overwrite') overwrite += 1;
      else invalid += 1;
    }
    return { added, overwrite, invalid, validTotal: added + overwrite };
  }, [previewItems]);

  const readFileText = async (file: File) => {
    setError(null);
    setDecryptedDrafts(null);
    try {
      const content = await file.text();
      setRawText(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read uploaded file.');
    }
  };

  const handleDecrypt = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await decryptCookiesVault(rawText, passphrase);
      setDecryptedDrafts(result.cookies.map(cookieRecordToDraft));
      setPassphrase('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (summary.validTotal === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await applyCookieImportBatch({
        drafts: parsedState.drafts,
        existingCookies,
        mode: importMode,
        domainLabel: fallbackDomain || activeHost || 'imported',
      });
      await onImported(result.snapshot, result.appliedCount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <SecurityNotice variant="import" />

      {/* File Upload / Drag & Drop Zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFileText(file);
        }}
        className="flex flex-col items-center justify-center gap-1 p-3 rounded border border-dashed cursor-pointer text-center transition-colors"
        style={{
          backgroundColor: dragOver ? 'var(--ck-accent-soft)' : 'var(--ck-surface-alt)',
          borderColor: dragOver ? 'var(--ck-border-strong)' : 'var(--ck-border)',
        }}
      >
        <UploadIcon size={16} />
        <span className="text-xs font-medium">Drop `.cookies.json`, `.txt`, or `.cookira.enc.json` here or click to browse</span>
        <input
          type="file"
          accept=".json,.txt,.cookies"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFileText(file);
            e.target.value = '';
          }}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>Detected:</span>
          <span
            className="cookira-chip cookira-mono text-xs px-2 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--ck-accent-soft)',
              borderColor: 'var(--ck-border-strong)',
              color: 'var(--ck-accent)',
            }}
          >
            {detectedFormat.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="cookira-chip flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="accent-[var(--ck-accent)]"
            />
            <span>Merge</span>
          </label>
          <label className="cookira-chip flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="accent-[var(--ck-accent)]"
            />
            <span>Replace Scope</span>
          </label>
        </div>
      </div>

      {detectedFormat === 'header' && (
        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>
            Target Domain for Raw Cookie Header
          </span>
          <input
            type="text"
            value={fallbackDomain}
            onChange={(e) => setFallbackDomain(e.target.value)}
            placeholder="example.com"
            className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
          />
        </label>
      )}

      {detectedFormat === 'encrypted' && !decryptedDrafts && (
        <div className="flex items-end gap-2">
          <label className="block space-y-1 flex-1">
            <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>
              Vault Passphrase
            </span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase to decrypt"
              className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
            />
          </label>
          <button
            type="button"
            disabled={busy || !passphrase}
            onClick={() => void handleDecrypt()}
            className="cookira-btn-primary text-xs px-3 py-1.5"
          >
            {busy ? 'Decrypting...' : 'Decrypt'}
          </button>
        </div>
      )}

      <textarea
        rows={5}
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          setDecryptedDrafts(null);
          setError(null);
        }}
        placeholder="Paste JSON array, Playwright storageState, Netscape .txt, raw Cookie header, or Encrypted Vault..."
        className="cookira-input cookira-mono text-xs w-full p-2.5 resize-y"
      />

      {(parsedState.parseError || error) && (
        <div
          className="p-2 rounded border text-xs"
          style={{
            backgroundColor: 'var(--ck-danger-soft)',
            borderColor: 'var(--ck-danger)',
            color: 'var(--ck-danger)',
          }}
        >
          {error || parsedState.parseError}
        </div>
      )}

      <ImportDiffPreview items={previewItems} summary={summary} />

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="cookira-btn-secondary text-xs px-3 py-1.5">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || summary.validTotal === 0}
          onClick={() => void handleApply()}
          className="cookira-btn-primary text-xs px-4 py-1.5"
        >
          {busy ? 'Importing...' : `Import ${summary.validTotal} Cookies`}
        </button>
      </div>
    </div>
  );
};
