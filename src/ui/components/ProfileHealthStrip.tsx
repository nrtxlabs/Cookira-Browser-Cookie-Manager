import React from 'react';
import type { DomainHealthSummary } from '../../core/domainHealth';
import { formatByteSize } from '../../core/domainHealth';
import { LockIcon, UnlockIcon, UsersIcon } from './Icons';

interface ProfileHealthStripProps {
  activeHost: string | null;
  scopeAllDomains: boolean;
  health: DomainHealthSummary;
  profileCount: number;
  isLocked: boolean;
  onToggleLock: () => void;
  onOpenProfiles: () => void;
}

export const ProfileHealthStrip: React.FC<ProfileHealthStripProps> = ({
  activeHost,
  scopeAllDomains,
  health,
  profileCount,
  isLocked,
  onToggleLock,
  onOpenProfiles,
}) => {
  const statusColor =
    health.status === 'bloat_warning'
      ? 'var(--ck-danger)'
      : health.status === 'elevated'
        ? 'var(--ck-warn)'
        : 'var(--ck-success)';

  const domainProfilesLabel =
    profileCount > 0 ? `Profiles (${profileCount})` : 'Save Profile';

  return (
    <div
      className="px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2"
      style={{
        backgroundColor: 'var(--ck-surface-alt)',
        borderColor: 'var(--ck-border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenProfiles}
          className="cookira-btn-secondary px-2 py-1 text-xs flex items-center gap-1.5"
        >
          <UsersIcon size={13} />
          <span className="cookira-chip">{domainProfilesLabel}</span>
        </button>

        {!scopeAllDomains && activeHost && (
          <button
            type="button"
            onClick={onToggleLock}
            className="cookira-chip text-xs px-2 py-1 rounded border flex items-center gap-1 cursor-pointer"
            style={{
              backgroundColor: isLocked ? 'var(--ck-warn-soft)' : 'var(--ck-surface)',
              borderColor: isLocked ? 'var(--ck-warn)' : 'var(--ck-border)',
              color: isLocked ? 'var(--ck-warn)' : 'var(--ck-text-muted)',
            }}
            title={
              isLocked
                ? 'Domain is locked against accidental edit or deletion'
                : 'Lock domain to prevent accidental delete'
            }
          >
            {isLocked ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
            <span>{isLocked ? 'Locked' : 'Lock'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {health.expiredCount > 0 && (
          <span
            className="cookira-chip cookira-mono text-[11px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--ck-danger-soft)',
              borderColor: 'var(--ck-danger)',
              color: 'var(--ck-danger)',
            }}
          >
            {health.expiredCount} Expired
          </span>
        )}
        <div
          className="cookira-chip cookira-mono text-xs flex items-center gap-1.5"
          title="Estimated HTTP Cookie header size (warning near 8 KB HTTP 431 limit)"
        >
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <span>{formatByteSize(health.headerBytes)}</span>
          <span style={{ color: 'var(--ck-text-muted)' }}>({health.totalCount})</span>
        </div>
      </div>
    </div>
  );
};
