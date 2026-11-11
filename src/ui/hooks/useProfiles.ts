import { useCallback, useEffect, useState } from 'react';
import type { CookieRecord, SessionProfile, UndoSnapshot } from '../../core/types';
import {
  createOrUpdateProfile,
  deleteProfile,
  loadProfiles,
  renameProfile,
  switchActiveSessionToProfile,
} from '../../storage/profilesStore';

export function useProfiles(onAfterMutate?: (snapshot: UndoSnapshot) => Promise<void>) {
  const [profiles, setProfiles] = useState<SessionProfile[]>([]);

  const reloadProfiles = useCallback(async () => {
    const list = await loadProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    void reloadProfiles();
  }, [reloadProfiles]);

  const saveSnapshotProfile = useCallback(
    async (options: {
      name: string;
      domain: string;
      includeSubdomains: boolean;
      cookies: CookieRecord[];
    }) => {
      const updated = await createOrUpdateProfile(options);
      setProfiles(updated);
      return updated;
    },
    [],
  );

  const applyProfile = useCallback(
    async (profile: SessionProfile) => {
      const result = await switchActiveSessionToProfile(profile);
      if (onAfterMutate) {
        await onAfterMutate(result.snapshot);
      }
      return result;
    },
    [onAfterMutate],
  );

  const renameSavedProfile = useCallback(async (id: string, nextName: string) => {
    const updated = await renameProfile(id, nextName);
    setProfiles(updated);
  }, []);

  const removeSavedProfile = useCallback(async (id: string) => {
    const updated = await deleteProfile(id);
    setProfiles(updated);
  }, []);

  return {
    profiles,
    reloadProfiles,
    saveSnapshotProfile,
    applyProfile,
    renameSavedProfile,
    removeSavedProfile,
  };
}
