import type { CookieDraft, CookieRecord, CookiraSettings, UndoSnapshot } from './types';
import { getAllCookies, removeBrowserCookie, setBrowserCookie } from './browserApi';
import { toChromeCookieSetDetails } from './cookieRules';
import { normalizeDomainHost, partitionKeysEqual } from './cookieUrl';
import { isDomainLocked } from '../storage/settingsStore';

export async function saveCookieWithUndo(options: {
  draft: CookieDraft;
  allCookies: CookieRecord[];
  settings: CookiraSettings;
}): Promise<{ saved: CookieRecord | null; snapshot: UndoSnapshot; nextCookies: CookieRecord[] }> {
  const { draft, allCookies, settings } = options;
  if (isDomainLocked(draft.domain, settings)) {
    throw new Error(`Domain "${normalizeDomainHost(draft.domain)}" is locked.`);
  }

  const prevMatch = draft.originalKey
    ? allCookies.find(
        (c) =>
          c.name === draft.originalKey?.name &&
          c.domain === draft.originalKey?.domain &&
          c.path === draft.originalKey?.path &&
          c.storeId === (draft.originalKey?.storeId ?? c.storeId) &&
          partitionKeysEqual(c.partitionKey, draft.originalKey?.partitionKey),
      )
    : undefined;

  const snapshot: UndoSnapshot = {
    id: `undo_save_${Date.now()}`,
    label: prevMatch ? `Edit "${draft.name}"` : `Create "${draft.name}"`,
    domain: normalizeDomainHost(draft.domain),
    createdAt: Date.now(),
    previousCookies: prevMatch ? [{ ...prevMatch }] : [],
    appliedKeys: [
      {
        name: draft.name,
        domain: draft.domain,
        path: draft.path || '/',
        storeId: draft.storeId,
        partitionKey: draft.partitionKey,
      },
    ],
  };

  const details = toChromeCookieSetDetails(draft);

  if (draft.originalKey) {
    const identityChanged =
      draft.originalKey.name !== draft.name ||
      normalizeDomainHost(draft.originalKey.domain) !== normalizeDomainHost(draft.domain) ||
      draft.originalKey.path !== (draft.path || '/') ||
      (draft.originalKey.storeId ?? '0') !== (draft.storeId ?? '0');

    if (identityChanged) {
      await removeBrowserCookie(draft.originalKey, prevMatch?.secure ?? true);
    }
  }

  const saved = await setBrowserCookie(details);
  const nextCookies = await getAllCookies({});
  return { saved, snapshot, nextCookies };
}

export async function deleteSingleCookieWithUndo(options: {
  cookie: CookieRecord;
  settings: CookiraSettings;
}): Promise<{ snapshot: UndoSnapshot; nextCookies: CookieRecord[] }> {
  const { cookie, settings } = options;
  if (isDomainLocked(cookie.domain, settings)) {
    throw new Error(`Domain "${normalizeDomainHost(cookie.domain)}" is locked.`);
  }

  const snapshot: UndoSnapshot = {
    id: `undo_del_${Date.now()}`,
    label: `Delete "${cookie.name}"`,
    domain: normalizeDomainHost(cookie.domain),
    createdAt: Date.now(),
    previousCookies: [{ ...cookie }],
    appliedKeys: [],
  };

  await removeBrowserCookie(
    {
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      storeId: cookie.storeId,
      partitionKey: cookie.partitionKey,
    },
    cookie.secure,
  );
  const nextCookies = await getAllCookies({});
  return { snapshot, nextCookies };
}

export async function deleteCookiesBatchWithUndo(options: {
  targets: CookieRecord[];
  label: string;
  activeHost: string | null;
  settings: CookiraSettings;
}): Promise<{ removedCount: number; snapshot: UndoSnapshot; nextCookies: CookieRecord[] }> {
  const unlocked = options.targets.filter((c) => !isDomainLocked(c.domain, options.settings));
  if (unlocked.length === 0) {
    throw new Error('All targeted cookies belong to locked domains.');
  }

  const snapshot: UndoSnapshot = {
    id: `undo_bulk_${Date.now()}`,
    label: `${options.label} (${unlocked.length})`,
    domain: options.activeHost ?? 'multiple',
    createdAt: Date.now(),
    previousCookies: unlocked.map((c) => ({ ...c })),
    appliedKeys: [],
  };

  for (const c of unlocked) {
    await removeBrowserCookie(
      {
        name: c.name,
        domain: c.domain,
        path: c.path,
        storeId: c.storeId,
        partitionKey: c.partitionKey,
      },
      c.secure,
    );
  }

  const nextCookies = await getAllCookies({});
  return { removedCount: unlocked.length, snapshot, nextCookies };
}
