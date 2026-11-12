import React, { useState } from 'react';
import type { CookieRecord, SessionProfile } from '../../core/types';
import { CloseIcon, TrashIcon, UsersIcon } from './Icons';
import { SecurityNotice } from './SecurityNotice';

interface ProfilesModalProps {
  profiles: SessionProfile[];
  activeHost: string | null;
  includeSubdomains: boolean;
  scopedCookies: CookieRecord[];
  isLocked: boolean;
  onSaveProfile: (name: string) => Promise<void>;
  onSwitchProfile: (profile: SessionProfile) => Promise<void>;
  onRenameProfile: (id: string, nextName: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onClose: () => void;
}

export const ProfilesModal: React.FC<ProfilesModalProps> = ({
  profiles,
  activeHost,
  includeSubdomains,
  scopedCookies,
  isLocked,
  onSaveProfile,
  onSwitchProfile,
  onRenameProfile,
  onDeleteProfile,
  onClose,
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !activeHost) return;
    setError(null);
    try {
      await onSaveProfile(newName.trim());
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSwitch = async (profile: SessionProfile) => {
    setBusyId(profile.id);
    setError(null);
    try {
      await onSwitchProfile(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Session Profiles"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto cookira-scroll rounded border p-4 space-y-3"
        style={{
          backgroundColor: 'var(--ck-surface)',
          borderColor: 'var(--ck-border-strong)',
          boxShadow: 'var(--ck-shadow)',
        }}
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--ck-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <UsersIcon size={15} />
            <span className="cookira-mono text-xs font-bold uppercase">Account Session Profiles</span>
          </div>
          <button type="button" onClick={onClose} className="cookira-btn-secondary p-1" aria-label="Close profiles modal">
            <CloseIcon size={14} />
          </button>
        </div>

        <SecurityNotice variant="profiles" />

        <form onSubmit={(e) => void handleSave(e)} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={activeHost ? `Save ${activeHost} (${scopedCookies.length}) as @profile...` : 'Select a specific domain first'}
            disabled={!activeHost}
            className="cookira-input cookira-mono text-xs px-2.5 py-1.5 flex-1 min-w-[180px]"
          />
          <button
            type="submit"
            disabled={!activeHost || !newName.trim() || scopedCookies.length === 0}
            className="cookira-btn-primary text-xs px-3 py-1.5"
          >
            Save Snapshot
          </button>
        </form>

        {activeHost && (
          <div className="text-xs" style={{ color: 'var(--ck-text-muted)' }}>
            Target: <span className="cookira-mono">{activeHost}</span> ({includeSubdomains ? 'including subdomains' : 'exact host'})
          </div>
        )}

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

        <div className="space-y-2 max-h-72 overflow-y-auto cookira-scroll">
          {profiles.length === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--ck-text-muted)' }}>
              No saved account profiles yet. Save current cookies above to switch accounts in 1 click.
            </div>
          ) : (
            profiles.map((p) => (
              <div
                key={p.id}
                className="p-2.5 rounded border flex flex-wrap items-center justify-between gap-2"
                style={{
                  backgroundColor: 'var(--ck-surface-alt)',
                  borderColor: 'var(--ck-border)',
                }}
              >
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="cookira-input cookira-mono text-xs px-2 py-1 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void onRenameProfile(p.id, editValue).then(() => setEditingId(null));
                        }}
                        className="cookira-btn-primary text-xs px-2 py-1"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="cookira-mono text-xs font-semibold truncate">{p.name}</div>
                      <div className="cookira-mono text-xs truncate" style={{ color: 'var(--ck-text-muted)' }}>
                        {p.domain} · {p.cookies.length} cookies
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isLocked || busyId === p.id}
                    onClick={() => void handleSwitch(p)}
                    className="cookira-btn-primary text-xs px-2.5 py-1"
                  >
                    {busyId === p.id ? 'Switching...' : 'Switch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditValue(p.name);
                    }}
                    className="cookira-btn-secondary text-xs px-2 py-1"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteProfile(p.id)}
                    className="cookira-btn-danger p-1.5"
                    aria-label={`Delete profile ${p.name}`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
