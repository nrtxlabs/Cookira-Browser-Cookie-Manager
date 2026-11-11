import React from 'react';

interface CookieExpiryFieldsProps {
  session: boolean;
  expirationDate?: number;
  onApplyPreset: (secondsToAdd: number | null) => void;
  onChangeTimestamp: (epochSec: number) => void;
}

function toDatetimeLocalValue(epochSec?: number): string {
  if (!epochSec || !Number.isFinite(epochSec)) return '';
  const d = new Date(epochSec * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EXPIRY_PRESETS: Array<{ label: string; sec: number | null }> = [
  { label: 'Session', sec: null },
  { label: '+1h', sec: 3600 },
  { label: '+24h', sec: 86400 },
  { label: '+7d', sec: 86400 * 7 },
  { label: '+1y', sec: 86400 * 365 },
];

export const CookieExpiryFields: React.FC<CookieExpiryFieldsProps> = ({
  session,
  expirationDate,
  onApplyPreset,
  onChangeTimestamp,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--ck-text-muted)' }}>Expiration</span>
        <div className="flex flex-wrap items-center gap-1">
          {EXPIRY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onApplyPreset(preset.sec)}
              className="cookira-btn-secondary cookira-mono text-[11px] px-2 py-0.5"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={session}
            onChange={(e) => onApplyPreset(e.target.checked ? null : 86400 * 7)}
            className="accent-[var(--ck-accent)]"
          />
          <span>Session Cookie</span>
        </label>
        {!session && (
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(expirationDate)}
            onChange={(e) => {
              const ms = Date.parse(e.target.value);
              if (Number.isFinite(ms)) {
                onChangeTimestamp(Math.floor(ms / 1000));
              }
            }}
            className="cookira-input cookira-mono text-xs px-2 py-1 flex-1 min-w-0"
          />
        )}
      </div>
    </div>
  );
};
