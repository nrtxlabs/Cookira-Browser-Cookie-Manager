import { useCallback, useEffect, useState } from 'react';
import type { WatcherEvent } from '../../core/types';
import { getCookiesApiRaw } from '../../core/browserApi';
import { clearWatcherEvents, loadWatcherEvents } from '../../storage/watcherStore';

export function useWatcher(enabled: boolean) {
  const [events, setEvents] = useState<WatcherEvent[]>([]);

  const refreshWatcher = useCallback(async () => {
    const list = await loadWatcherEvents();
    setEvents(list);
  }, []);

  useEffect(() => {
    void refreshWatcher();
  }, [refreshWatcher]);

  useEffect(() => {
    if (!enabled) return;
    const api = getCookiesApiRaw();
    if (!api?.onChanged) return;

    const listener = () => {
      // Slight defer lets background listener persist the latest event first
      setTimeout(() => {
        void refreshWatcher();
      }, 60);
    };
    api.onChanged.addListener(listener);
    return () => {
      api.onChanged.removeListener(listener);
    };
  }, [enabled, refreshWatcher]);

  const clearLogs = useCallback(async () => {
    await clearWatcherEvents();
    setEvents([]);
  }, []);

  return {
    events,
    refreshWatcher,
    clearLogs,
  };
}
