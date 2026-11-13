import { useCallback } from 'react';
import type { CookieDraft, CookieRecord } from '../../core/types';
import { cookieIdentityId } from '../../core/cookieUrl';
import type { ConfirmState } from '../components/WorkspaceModals';

interface UseWorkspaceCallbacksOptions {
  isSplitLayout: boolean;
  confirmBeforeDelete: boolean;
  scopeAllDomains: boolean;
  activeHost: string | null;
  selectedKeyId: string | null;
  saveCookie: (draft: CookieDraft) => Promise<unknown>;
  deleteCookie: (cookie: CookieRecord) => Promise<unknown>;
  deleteCookiesBatch: (targets: CookieRecord[], label: string) => Promise<number>;
  undoLastAction: () => Promise<{ label: string } | null>;
  setEditingDraft: (next: { draft: CookieDraft; isNew: boolean } | null) => void;
  setConfirmState: (next: ConfirmState | null) => void;
  notify: (msg: string) => void;
}

export function useWorkspaceCallbacks(opts: UseWorkspaceCallbacksOptions) {
  const {
    isSplitLayout,
    confirmBeforeDelete,
    scopeAllDomains,
    activeHost,
    selectedKeyId,
    saveCookie,
    deleteCookie,
    deleteCookiesBatch,
    undoLastAction,
    setEditingDraft,
    setConfirmState,
    notify,
  } = opts;

  const handleCopy = useCallback(
    async (label: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify(`Copied ${label} to clipboard`);
      } catch {
        notify('Unable to access clipboard');
      }
    },
    [notify],
  );

  const handleSaveCookie = async (draft: CookieDraft) => {
    await saveCookie(draft);
    notify(`Saved cookie "${draft.name}"`);
    if (!isSplitLayout) {
      setEditingDraft(null);
      return;
    }
    const originalKey = {
      name: draft.name,
      domain: draft.domain,
      path: draft.path,
      storeId: draft.storeId,
      partitionKey: draft.partitionKey,
    };
    setEditingDraft({ draft: { ...draft, originalKey }, isNew: false });
  };

  const handleDeleteCookie = async (cookie: CookieRecord) => {
    try {
      await deleteCookie(cookie);
      if (selectedKeyId === cookieIdentityId(cookie)) setEditingDraft(null);
      notify(`Deleted "${cookie.name}"`);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err));
    }
  };

  const runClearAction = (targets: CookieRecord[], title: string, label: string) => {
    const exec = async () => {
      try {
        const count = await deleteCookiesBatch(targets, label);
        setEditingDraft(null);
        notify(`Removed ${count} cookies`);
      } catch (err) {
        notify(err instanceof Error ? err.message : String(err));
      } finally {
        setConfirmState(null);
      }
    };
    if (!confirmBeforeDelete) return void exec();
    setConfirmState({
      title,
      message: `Delete ${targets.length} cookie(s) from ${scopeAllDomains ? 'visible scopes' : activeHost ?? 'current scope'}? An Undo snapshot will be captured.`,
      confirmLabel: `Delete (${targets.length})`,
      action: exec,
    });
  };

  const handleUndo = async () => {
    try {
      const restored = await undoLastAction();
      if (restored) notify(`Undone: ${restored.label}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err));
    }
  };

  return { handleCopy, handleSaveCookie, handleDeleteCookie, runClearAction, handleUndo };
}
