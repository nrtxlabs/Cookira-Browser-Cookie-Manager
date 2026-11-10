import type { UndoSnapshot } from '../core/types';
import { storageSessionGet, storageSessionSet } from '../core/browserApi';

const UNDO_KEY = 'cookira_undo_stack_v1';
const MAX_UNDO_ITEMS = 5;

export async function loadUndoStack(): Promise<UndoSnapshot[]> {
  const stack = await storageSessionGet<UndoSnapshot[]>(UNDO_KEY, []);
  return Array.isArray(stack) ? stack : [];
}

export async function pushUndoSnapshot(snapshot: UndoSnapshot): Promise<UndoSnapshot[]> {
  const current = await loadUndoStack();
  const next = [snapshot, ...current].slice(0, MAX_UNDO_ITEMS);
  await storageSessionSet({ [UNDO_KEY]: next });
  return next;
}

export async function popUndoSnapshot(): Promise<{
  popped: UndoSnapshot | null;
  remaining: UndoSnapshot[];
}> {
  const current = await loadUndoStack();
  if (current.length === 0) {
    return { popped: null, remaining: [] };
  }
  const [popped, ...remaining] = current;
  await storageSessionSet({ [UNDO_KEY]: remaining });
  return { popped, remaining };
}
