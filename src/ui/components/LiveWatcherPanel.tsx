import React, { useMemo, useState } from 'react';
import type { WatcherEvent } from '../../core/types';
import { ActivityIcon, DownloadIcon, TrashIcon } from './Icons';

interface LiveWatcherPanelProps {
  events: WatcherEvent[];
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onClear: () => void;
}

const CAUSE_OPTIONS = [
  'all',
  'explicit',
  'overwrite',
  'expired',
  'evicted',
  'expired_overwrite',
] as const;

type CauseFilter = (typeof CAUSE_OPTIONS)[number];

function triggerAuditDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const LiveWatcherPanel: React.FC<LiveWatcherPanelProps> = ({
  events,
  enabled,
  onToggleEnabled,
  onClear,
}) => {
  const [filter, setFilter] = useState('');
  const [causeFilter, setCauseFilter] = useState<CauseFilter>('all');

  const visibleEvents = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return events.filter((ev) => {
      if (causeFilter !== 'all' && ev.cause !== causeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.cookie.name.toLowerCase().includes(q) ||
        ev.cookie.domain.toLowerCase().includes(q) ||
        ev.cause.toLowerCase().includes(q)
      );
    });
  }, [events, filter, causeFilter]);

  const handleExportAudit = () => {
    const payload = {
      format: 'cookira-watcher-audit',
      exportedAt: new Date().toISOString(),
      causeFilter,
      totalEvents: visibleEvents.length,
      note: 'Metadata-only audit log (raw cookie values omitted for session security).',
      events: visibleEvents.map((ev) => ({
        id: ev.id,
        timestamp: ev.timestamp,
        isoTime: new Date(ev.timestamp).toISOString(),
        action: ev.removed ? 'removed' : 'set',
        cause: ev.cause,
        cookie: {
          name: ev.cookie.name,
          domain: ev.cookie.domain,
          path: ev.cookie.path,
          storeId: ev.cookie.storeId ?? '0',
          secure: ev.cookie.secure,
          httpOnly: ev.cookie.httpOnly,
          sameSite: ev.cookie.sameSite,
          session: ev.cookie.session,
          valueLength: ev.cookie.value.length,
        },
      })),
    };
    const dateSlug = new Date().toISOString().slice(0, 10);
    triggerAuditDownload(
      JSON.stringify(payload, null, 2),
      `cookira-watcher-audit-${dateSlug}.json`,
    );
  };

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--ck-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <ActivityIcon size={14} />
          <span className="cookira-mono text-xs font-bold uppercase">Live Cookie Watcher</span>
          <span
            className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: enabled ? 'var(--ck-success-soft)' : 'var(--ck-surface-alt)',
              borderColor: enabled ? 'var(--ck-success)' : 'var(--ck-border)',
              color: enabled ? 'var(--ck-success)' : 'var(--ck-text-muted)',
            }}
          >
            {enabled ? 'LIVE' : 'PAUSED'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleEnabled(!enabled)}
            className="cookira-btn-secondary text-xs px-2.5 py-1"
          >
            {enabled ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={handleExportAudit}
            disabled={visibleEvents.length === 0}
            title="Export filtered watcher audit log as metadata-only JSON"
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <DownloadIcon size={12} />
            <span className="cookira-chip">Export JSON</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <TrashIcon size={12} />
            <span className="cookira-chip">Clear</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter watcher by cookie name, domain, or cause..."
          className="cookira-input cookira-mono text-xs flex-1 min-w-[160px] px-2.5 py-1.5"
        />
        <select
          aria-label="Filter watcher mutation cause"
          value={causeFilter}
          onChange={(e) => setCauseFilter(e.target.value as CauseFilter)}
          className="cookira-input cookira-mono text-xs px-2 py-1.5"
        >
          {CAUSE_OPTIONS.map((cause) => (
            <option key={cause} value={cause}>
              {cause === 'all' ? 'Cause: All' : `Cause: ${cause}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto cookira-scroll">
        {visibleEvents.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--ck-text-muted)' }}>
            No cookie mutations recorded yet.
          </div>
        ) : (
          visibleEvents.map((ev) => {
            const time = new Date(ev.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <div
                key={ev.id}
                className="p-2 rounded border text-xs cookira-mono space-y-1"
                style={{
                  backgroundColor: 'var(--ck-surface-alt)',
                  borderColor: 'var(--ck-border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="cookira-chip text-[11px] px-1.5 py-0.5 rounded border font-semibold"
                      style={{
                        backgroundColor: ev.removed ? 'var(--ck-danger-soft)' : 'var(--ck-success-soft)',
                        borderColor: ev.removed ? 'var(--ck-danger)' : 'var(--ck-success)',
                        color: ev.removed ? 'var(--ck-danger)' : 'var(--ck-success)',
                      }}
                    >
                      {ev.removed ? 'DEL' : 'SET'}
                    </span>
                    <span className="font-semibold truncate">{ev.cookie.name}</span>
                  </div>
                  <span className="cookira-chip text-[11px]" style={{ color: 'var(--ck-text-muted)' }}>
                    {ev.cause} · {time}
                  </span>
                </div>
                <div className="truncate" style={{ color: 'var(--ck-text-muted)' }}>
                  {ev.cookie.domain}
                  {ev.cookie.path}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
