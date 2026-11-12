import React, { useMemo, useState } from 'react';
import type { WatcherEvent } from '../../core/types';
import { ActivityIcon, TrashIcon } from './Icons';

interface LiveWatcherPanelProps {
  events: WatcherEvent[];
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onClear: () => void;
}

export const LiveWatcherPanel: React.FC<LiveWatcherPanelProps> = ({
  events,
  enabled,
  onToggleEnabled,
  onClear,
}) => {
  const [filter, setFilter] = useState('');

  const visibleEvents = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (ev) =>
        ev.cookie.name.toLowerCase().includes(q) ||
        ev.cookie.domain.toLowerCase().includes(q) ||
        ev.cause.toLowerCase().includes(q),
    );
  }, [events, filter]);

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
            onClick={onClear}
            className="cookira-btn-secondary text-xs px-2 py-1 flex items-center gap-1"
          >
            <TrashIcon size={12} />
            <span className="cookira-chip">Clear</span>
          </button>
        </div>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter watcher by cookie name, domain, or cause..."
        className="cookira-input cookira-mono text-xs w-full px-2.5 py-1.5"
      />

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
