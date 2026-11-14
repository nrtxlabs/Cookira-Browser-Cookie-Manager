import type { CookieRecord, SessionProfile, UndoSnapshot } from '../core/types';
import {
  getAllCookies,
  removeBrowserCookie,
  setBrowserCookie,
  storageLocalGet,
  storageLocalSet,
} from '../core/browserApi';
import { cookieRecordToDraft, toChromeCookieSetDetails } from '../core/cookieRules';
import { domainMatchesHost, normalizeDomainHost } from '../core/cookieUrl';

const PROFILES_KEY = 'cookira_profiles_v1';

export async function loadProfiles(): Promise<SessionProfile[]> {
  const list = await storageLocalGet<SessionProfile[]>(PROFILES_KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function saveProfilesList(profiles: SessionProfile[]): Promise<void> {
  await storageLocalSet({ [PROFILES_KEY]: profiles });
}

export async function createOrUpdateProfile(options: {
  name: string;
  domain: string;
  includeSubdomains: boolean;
  cookies: CookieRecord[];
}): Promise<SessionProfile[]> {
  const cleanName = options.name.trim();
  const cleanDomain = normalizeDomainHost(options.domain);
  if (!cleanName) throw new Error('Profile name cannot be empty.');
  if (!cleanDomain) throw new Error('Profile domain cannot be empty.');

  const existing = await loadProfiles();
  const now = Date.now();
  const matchIdx = existing.findIndex(
    (p) =>
      p.domain === cleanDomain &&
      p.name.toLowerCase() === cleanName.toLowerCase(),
  );

  const nextProfile: SessionProfile = {
    id: matchIdx >= 0 ? existing[matchIdx].id : `prof_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    domain: cleanDomain,
    includeSubdomains: options.includeSubdomains,
    createdAt: matchIdx >= 0 ? existing[matchIdx].createdAt : now,
    updatedAt: now,
    cookies: options.cookies.map((c) => ({ ...c })),
  };

  const updated =
    matchIdx >= 0
      ? existing.map((p, idx) => (idx === matchIdx ? nextProfile : p))
      : [nextProfile, ...existing];

  await saveProfilesList(updated);
  return updated;
}

export async function renameProfile(id: string, nextName: string): Promise<SessionProfile[]> {
  const clean = nextName.trim();
  if (!clean) throw new Error('Profile name cannot be empty.');
  const existing = await loadProfiles();
  const updated = existing.map((p) =>
    p.id === id ? { ...p, name: clean, updatedAt: Date.now() } : p,
  );
  await saveProfilesList(updated);
  return updated;
}

export async function deleteProfile(id: string): Promise<SessionProfile[]> {
  const existing = await loadProfiles();
  const updated = existing.filter((p) => p.id !== id);
  await saveProfilesList(updated);
  return updated;
}

export async function mergeImportedProfiles(
  incoming: SessionProfile[],
): Promise<{ merged: SessionProfile[]; importedCount: number }> {
  const existing = await loadProfiles();
  const map = new Map<string, SessionProfile>();
  for (const p of existing) {
    map.set(`${p.domain}::${p.name.toLowerCase()}`, p);
  }
  let importedCount = 0;
  for (const item of incoming) {
    if (!item?.name || !item?.domain || !Array.isArray(item.cookies)) continue;
    const cleanDomain = normalizeDomainHost(item.domain);
    const key = `${cleanDomain}::${item.name.trim().toLowerCase()}`;
    map.set(key, {
      ...item,
      id: item.id || `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      domain: cleanDomain,
      name: item.name.trim(),
      updatedAt: Date.now(),
    });
    importedCount += 1;
  }
  const merged = [...map.values()];
  await saveProfilesList(merged);
  return { merged, importedCount };
}

export async function switchActiveSessionToProfile(
  profile: SessionProfile,
): Promise<{ applied: number; snapshot: UndoSnapshot; rolledBack: boolean }> {
  const allCurrent = await getAllCookies({});
  const targetCookies = allCurrent.filter((c) =>
    domainMatchesHost(c.domain, profile.domain, profile.includeSubdomains),
  );

  const snapshot: UndoSnapshot = {
    id: `undo_prof_${Date.now()}`,
    label: `Switch profile to "${profile.name}"`,
    domain: profile.domain,
    createdAt: Date.now(),
    previousCookies: targetCookies.map((c) => ({ ...c })),
    appliedKeys: profile.cookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      storeId: c.storeId,
      partitionKey: c.partitionKey,
    })),
  };

  for (const oldCookie of targetCookies) {
    await removeBrowserCookie(
      {
        name: oldCookie.name,
        domain: oldCookie.domain,
        path: oldCookie.path,
        storeId: oldCookie.storeId,
        partitionKey: oldCookie.partitionKey,
      },
      oldCookie.secure,
    );
  }

  let applied = 0;
  for (const cookie of profile.cookies) {
    try {
      await setBrowserCookie(toChromeCookieSetDetails(cookieRecordToDraft(cookie)));
      applied += 1;
    } catch {
      // Continue injecting remaining cookies
    }
  }

  let rolledBack = false;
  if (applied === 0 && profile.cookies.length > 0 && targetCookies.length > 0) {
    for (const prev of targetCookies) {
      try {
        await setBrowserCookie(toChromeCookieSetDetails(cookieRecordToDraft(prev)));
      } catch {
        // Best-effort rollback
      }
    }
    rolledBack = true;
  }

  return { applied, snapshot, rolledBack };
}
