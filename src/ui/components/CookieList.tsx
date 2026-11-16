import React from 'react';
import type { CookieRecord, CookieStoreInfo, UiDensityMode } from '../../core/types';
import { resolveStoreLabel } from '../../core/browserApi';
import { cookieIdentityId } from '../../core/cookieUrl';
import {
  computeCookieBytes,
  formatByteSize,
  formatExpiryRemaining,
  isCookieExpired,
} from '../../core/domainHealth';
import { CopyIcon, TrashIcon } from './Icons';

interface CookieListProps {
  uiMode: UiDensityMode;
  cookies: CookieRecord[];
  stores?: CookieStoreInfo[];
  selectedKeyId: string | null;
  selectedIds: Set<string>;
  isLocked: boolean;
  loading: boolean;
  runtimeAvailable: boolean;
  onSelectCookie: (cookie: CookieRecord) => void;
  onToggleCheckbox: (cookie: CookieRecord) => void;
  onCopyValue: (cookie: CookieRecord) => void;
  onDeleteCookie: (cookie: CookieRecord) => void;
  onSwitchToAllDomains: () => void;
}

export const CookieList: React.FC<CookieListProps> = ({
  uiMode,
  cookies,
  stores,
  selectedKeyId,
  selectedIds,
  isLocked,
  loading,
  runtimeAvailable,
  onSelectCookie,
  onToggleCheckbox,
  onCopyValue,
  onDeleteCookie,
  onSwitchToAllDomains,
}) => {
  if (loading) {
    return (
      <div className="p-6 text-center text-xs cookira-mono" style={{ color: 'var(--ck-text-muted)' }}>
        Scanning browser cookie store...
      </div>
    );
  }

  if (cookies.length === 0) {
    return (
      <div className="p-6 text-center space-y-2">
        <div className="cookira-mono text-xs font-semibold">
          {runtimeAvailable ? 'No cookies matched current scope.' : 'Extension cookie API inactive in standalone preview.'}
        </div>
        <p className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>
          {runtimeAvailable
            ? 'Try switching to All Domains, toggling *.Sub, or clearing the search filter.'
            : 'Load dist/chrome or dist/firefox in your browser to inspect live site cookies.'}
        </p>
        {runtimeAvailable && (
          <button
            type="button"
            onClick={onSwitchToAllDomains}
            className="cookira-btn-secondary text-xs px-3 py-1.5"
          >
            Show All Domains
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1.5">
      {cookies.map((cookie) => {
        const id = cookieIdentityId(cookie);
        const isActive = selectedKeyId === id;
        const isChecked = selectedIds.has(id);
        const expired = isCookieExpired(cookie);
        const bytes = computeCookieBytes(cookie);

        return (
          <div
            key={id}
            onClick={() => onSelectCookie(cookie)}
            className="p-2 rounded border cursor-pointer transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--ck-accent-soft)' : 'var(--ck-surface)',
              borderColor: isActive ? 'var(--ck-border-strong)' : 'var(--ck-border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {uiMode === 'advanced' && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    aria-label={`Select ${cookie.name}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleCheckbox(cookie)}
                    className="shrink-0 accent-[var(--ck-accent)]"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCookie(cookie);
                  }}
                  aria-label={`Inspect ${cookie.name}`}
                  className="cookira-mono text-xs font-semibold truncate text-left bg-transparent border-0 p-0 cursor-pointer hover:underline"
                  style={{ color: 'inherit' }}
                >
                  {cookie.name}
                </button>
                {uiMode === 'advanced' && cookie.hostOnly && (
                  <span
                    className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--ck-success-soft)',
                      borderColor: 'var(--ck-success)',
                      color: 'var(--ck-success)',
                    }}
                  >
                    HostOnly
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="cookira-chip cookira-mono text-[11px]"
                  style={{ color: expired ? 'var(--ck-danger)' : 'var(--ck-text-muted)' }}
                >
                  {uiMode === 'advanced'
                    ? `${formatByteSize(bytes)} · ${formatExpiryRemaining(cookie)}`
                    : formatExpiryRemaining(cookie)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyValue(cookie);
                  }}
                  className="cookira-btn-secondary p-1"
                  title="Copy cookie value"
                  aria-label={`Copy ${cookie.name} value`}
                >
                  <CopyIcon size={12} />
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCookie(cookie);
                  }}
                  className="cookira-btn-danger p-1"
                  title="Delete cookie"
                  aria-label={`Delete ${cookie.name}`}
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="cookira-mono truncate opacity-90" style={{ color: 'var(--ck-text-muted)' }}>
                {cookie.value || '(empty)'}
              </span>
              {uiMode === 'simple' && (cookie.httpOnly || cookie.secure) && (
                <span className="cookira-chip cookira-mono text-[11px]" style={{ color: 'var(--ck-text-muted)' }}>
                  {[cookie.httpOnly && 'HttpOnly', cookie.secure && 'Secure'].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>

            {uiMode === 'advanced' && (
              <>
                <div className="mt-1 text-[11px] cookira-mono truncate" style={{ color: 'var(--ck-text-muted)' }}>
                  {cookie.domain}
                  {cookie.path}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {cookie.httpOnly && (
                    <span
                      className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--ck-surface-alt)',
                        borderColor: 'var(--ck-border-subtle)',
                        color: 'var(--ck-text-muted)',
                      }}
                    >
                      HttpOnly
                    </span>
                  )}
                  {cookie.secure && (
                    <span
                      className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--ck-surface-alt)',
                        borderColor: 'var(--ck-border-subtle)',
                        color: 'var(--ck-text-muted)',
                      }}
                    >
                      Secure
                    </span>
                  )}
                  <span
                    className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--ck-surface-alt)',
                      borderColor: 'var(--ck-border-subtle)',
                      color: 'var(--ck-text-muted)',
                    }}
                  >
                    SameSite={cookie.sameSite}
                  </span>
                  {cookie.partitionKey?.topLevelSite && (
                    <span
                      className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--ck-accent-soft)',
                        borderColor: 'var(--ck-border)',
                        color: 'var(--ck-accent)',
                      }}
                    >
                      CHIPS
                    </span>
                  )}
                  {((stores && stores.length > 1) ||
                    (cookie.storeId &&
                      cookie.storeId !== '0' &&
                      cookie.storeId !== 'firefox-default')) && (
                    <span
                      className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--ck-surface-alt)',
                        borderColor: 'var(--ck-border-strong)',
                        color: 'var(--ck-text)',
                      }}
                      title={`Cookie store ${cookie.storeId ?? '0'}`}
                    >
                      {stores?.find((s) => s.id === (cookie.storeId ?? '0'))?.label ??
                        resolveStoreLabel(cookie.storeId ?? '0')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
