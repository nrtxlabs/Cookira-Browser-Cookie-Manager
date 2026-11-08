import type {
  CookieDraft,
  CookieIdentityKey,
  CookieRecord,
  ImportMode,
  ImportPreviewItem,
  UndoSnapshot,
} from './types';
import { removeBrowserCookie, setBrowserCookie } from './browserApi';
import { cookieIdentityId } from './cookieUrl';
import { cookieRecordToDraft, toChromeCookieSetDetails, validateCookieDraft } from './cookieRules';

export interface ApplyImportResult {
  appliedCount: number;
  skippedInvalidCount: number;
  failedKeys: string[];
  snapshot: UndoSnapshot;
  rolledBack: boolean;
}

export function buildImportPreview(
  drafts: CookieDraft[],
  existingCookies: CookieRecord[],
): ImportPreviewItem[] {
  const existingMap = new Set(existingCookies.map((c) => cookieIdentityId(c)));

  return drafts.map((draft, index) => {
    const errors = validateCookieDraft(draft);
    if (errors.length > 0) {
      return {
        index,
        draft,
        status: 'invalid',
        errors,
      };
    }

    const id = cookieIdentityId({
      name: draft.name,
      domain: draft.domain,
      path: draft.path || '/',
      storeId: draft.storeId ?? '0',
      partitionKey: draft.partitionKey,
    });

    return {
      index,
      draft,
      status: existingMap.has(id) ? 'overwrite' : 'new',
      errors: [],
    };
  });
}

function toIdentityKey(item: CookieRecord | CookieDraft): CookieIdentityKey {
  return {
    name: item.name,
    domain: item.domain,
    path: item.path || '/',
    storeId: item.storeId,
    partitionKey: item.partitionKey,
  };
}

/**
 * Execute an atomic-guarded cookie import batch:
 * 1. Pre-flight validates all drafts first.
 * 2. Captures rollback snapshot before mutating anything.
 * 3. In `replace` mode, rolls back automatically if writing valid items throws unexpectedly.
 */
export async function applyCookieImportBatch(options: {
  drafts: CookieDraft[];
  existingCookies: CookieRecord[];
  mode: ImportMode;
  domainLabel: string;
}): Promise<ApplyImportResult> {
  const preview = buildImportPreview(options.drafts, options.existingCookies);
  const validItems = preview.filter((p) => p.status !== 'invalid').map((p) => p.draft);
  const skippedInvalidCount = preview.length - validItems.length;

  if (validItems.length === 0) {
    throw new Error('No valid cookies found in import payload.');
  }

  const snapshot: UndoSnapshot = {
    id: `undo_${Date.now()}`,
    label: `Import (${options.mode}) ${validItems.length} cookies`,
    domain: options.domainLabel,
    createdAt: Date.now(),
    previousCookies: options.existingCookies.map((c) => ({ ...c })),
    appliedKeys: validItems.map((d) => toIdentityKey(d)),
  };

  if (options.mode === 'replace') {
    for (const oldCookie of options.existingCookies) {
      await removeBrowserCookie(toIdentityKey(oldCookie), oldCookie.secure);
    }
  }

  let appliedCount = 0;
  const failedKeys: string[] = [];

  for (const draft of validItems) {
    try {
      const setDetails = toChromeCookieSetDetails(draft);
      await setBrowserCookie(setDetails);
      appliedCount += 1;
    } catch {
      failedKeys.push(`${draft.name}@${draft.domain}`);
    }
  }

  let rolledBack = false;
  if (options.mode === 'replace' && appliedCount === 0 && options.existingCookies.length > 0) {
    for (const prev of options.existingCookies) {
      try {
        await setBrowserCookie(toChromeCookieSetDetails(cookieRecordToDraft(prev)));
      } catch {
        // Best-effort rollback
      }
    }
    rolledBack = true;
  }

  return {
    appliedCount,
    skippedInvalidCount,
    failedKeys,
    snapshot,
    rolledBack,
  };
}

export async function restoreUndoSnapshot(snapshot: UndoSnapshot): Promise<void> {
  // Remove newly applied cookies first if they didn't exist before
  for (const key of snapshot.appliedKeys) {
    try {
      await removeBrowserCookie(key, true);
    } catch {
      // Cookie may no longer exist
    }
  }

  for (const prev of snapshot.previousCookies) {
    await setBrowserCookie(toChromeCookieSetDetails(cookieRecordToDraft(prev)));
  }
}
