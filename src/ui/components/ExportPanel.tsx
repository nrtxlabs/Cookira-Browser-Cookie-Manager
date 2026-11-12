import React, { useEffect, useMemo, useState } from 'react';
import type { CookieRecord, ExportFormat, ExportScope } from '../../core/types';
import {
  serializeCookiesToHeader,
  serializeCookiesToJson,
  serializeCookiesToNetscape,
} from '../../codecs';
import { encryptCookiesVault } from '../../crypto/encryptedVault';
import { CopyIcon, DownloadIcon } from './Icons';
import { SecurityNotice } from './SecurityNotice';

interface ExportPanelProps {
  defaultFormat: 'json' | 'netscape' | 'header';
  activeHost: string | null;
  scopedCookies: CookieRecord[];
  filteredCookies: CookieRecord[];
  selectedCookies: CookieRecord[];
  allCookies: CookieRecord[];
  onNotify: (msg: string) => void;
}

type UiExportKind = ExportFormat | 'playwright';

export const ExportPanel: React.FC<ExportPanelProps> = ({
  defaultFormat,
  activeHost,
  scopedCookies,
  filteredCookies,
  selectedCookies,
  allCookies,
  onNotify,
}) => {
  const [format, setFormat] = useState<UiExportKind>(defaultFormat);
  const [scope, setScope] = useState<ExportScope>(
    selectedCookies.length > 0 ? 'selected' : 'domain',
  );
  const [passphrase, setPassphrase] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setPassphrase('');
    };
  }, []);

  const targetCookies = useMemo(() => {
    if (scope === 'selected' && selectedCookies.length > 0) return selectedCookies;
    if (scope === 'filtered') return filteredCookies;
    if (scope === 'all') return allCookies;
    return scopedCookies;
  }, [scope, selectedCookies, filteredCookies, allCookies, scopedCookies]);

  const plainOutput = useMemo(() => {
    if (format === 'encrypted') return encryptedText;
    if (format === 'playwright') return serializeCookiesToJson(targetCookies, 'playwright');
    if (format === 'json') return serializeCookiesToJson(targetCookies, 'standard');
    if (format === 'netscape') return serializeCookiesToNetscape(targetCookies);
    return serializeCookiesToHeader(targetCookies);
  }, [format, targetCookies, encryptedText]);

  const generateEncrypted = async (): Promise<string> => {
    setBusy(true);
    setError(null);
    try {
      const label = scope === 'all' ? 'all-domains' : activeHost ?? 'cookies';
      const output = await encryptCookiesVault(targetCookies, passphrase, label);
      setEncryptedText(output);
      return output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    setError(null);
    try {
      const payload = format === 'encrypted' ? encryptedText || (await generateEncrypted()) : plainOutput;
      await navigator.clipboard.writeText(payload);
      onNotify(`Copied ${targetCookies.length} cookies (${format})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clipboard copy failed.');
    }
  };

  const handleDownload = async () => {
    setError(null);
    try {
      const payload = format === 'encrypted' ? encryptedText || (await generateEncrypted()) : plainOutput;
      const base = (scope === 'all' ? 'all-domains' : activeHost || 'cookira').replace(/[^a-z0-9.-]/gi, '_');
      const ext =
        format === 'encrypted'
          ? 'cookira.enc.json'
          : format === 'netscape'
            ? 'cookies.txt'
            : format === 'header'
              ? 'cookie-header.txt'
              : 'cookies.json';
      const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify(`Downloaded ${base}.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Format</span>
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as UiExportKind);
              setEncryptedText('');
              setError(null);
            }}
            className="cookira-input text-xs w-full px-2.5 py-1.5"
          >
            <option value="json">JSON (Standard / Cookie-Editor)</option>
            <option value="playwright">JSON (Playwright / NRTX Runner)</option>
            <option value="netscape">Netscape HTTP Cookie File (.txt)</option>
            <option value="header">HTTP Cookie: Header String</option>
            <option value="encrypted">Encrypted Vault (.cookira.enc.json)</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Scope</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ExportScope)}
            className="cookira-input text-xs w-full px-2.5 py-1.5"
          >
            <option value="domain">Current Scope ({scopedCookies.length})</option>
            <option value="filtered">Filtered List ({filteredCookies.length})</option>
            <option value="selected" disabled={selectedCookies.length === 0}>
              Selected ({selectedCookies.length})
            </option>
            <option value="all">All Browser Cookies ({allCookies.length})</option>
          </select>
        </label>
      </div>

      {format === 'encrypted' && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block space-y-1 flex-1 min-w-[180px]">
            <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>
              Vault Passphrase (AES-256-GCM + PBKDF2)
            </span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setEncryptedText('');
              }}
              placeholder="Min. 4 characters (never stored)"
              className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
            />
          </label>
          <button
            type="button"
            disabled={busy || passphrase.length < 4}
            onClick={() => void generateEncrypted()}
            className="cookira-btn-secondary text-xs px-3 py-1.5"
          >
            {busy ? 'Encrypting...' : 'Encrypt Preview'}
          </button>
        </div>
      )}

      <SecurityNotice variant={format === 'encrypted' ? 'export-encrypted' : 'export'} />

      {error && (
        <div
          className="p-2 rounded border text-xs"
          style={{
            backgroundColor: 'var(--ck-danger-soft)',
            borderColor: 'var(--ck-danger)',
            color: 'var(--ck-danger)',
          }}
        >
          {error}
        </div>
      )}

      <textarea
        readOnly
        rows={8}
        value={plainOutput}
        aria-label="Export output preview"
        placeholder={format === 'encrypted' ? 'Enter passphrase and click Encrypt Preview, Copy, or Download.' : ''}
        className="cookira-input cookira-mono text-xs w-full p-2.5 resize-y"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="cookira-mono text-xs" style={{ color: 'var(--ck-text-muted)' }}>
          Ready: {targetCookies.length} cookies
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || targetCookies.length === 0}
            onClick={() => void handleCopy()}
            className="cookira-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <CopyIcon size={13} />
            <span className="cookira-chip">Copy</span>
          </button>
          <button
            type="button"
            disabled={busy || targetCookies.length === 0}
            onClick={() => void handleDownload()}
            className="cookira-btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <DownloadIcon size={13} />
            <span className="cookira-chip">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
