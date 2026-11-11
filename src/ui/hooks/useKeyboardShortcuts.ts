import { useEffect } from 'react';

interface ShortcutHandlers {
  onFocusSearch: () => void;
  onEscape: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlers.onEscape();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handlers.onOpenSettings();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        handlers.onOpenExport();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        handlers.onOpenImport();
        return;
      }

      if (event.key === '/' && !isEditableElement(event.target)) {
        event.preventDefault();
        handlers.onFocusSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
