import type { CookieRecord, WatcherEvent } from '../core/types';
import { storageSessionGet, storageSessionSet } from '../core/browserApi';

const WATCHER_KEY = 'cookira_watcher_events_v1';

export async function loadWatcherEvents(): Promise<WatcherEvent[]> {
  const items = await storageSessionGet<WatcherEvent[]>(WATCHER_KEY, []);
  return Array.isArray(items) ? items : [];
}

export async function appendWatcherEvent(
  event: Omit<WatcherEvent, 'id' | 'timestamp'>,
  maxEvents = 200,
): Promise<WatcherEvent[]> {
  const current = await loadWatcherEvents();
  const nextEvent: WatcherEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  const next = [nextEvent, ...current].slice(0, maxEvents);
  await storageSessionSet({ [WATCHER_KEY]: next });
  return next;
}

export async function clearWatcherEvents(): Promise<void> {
  await storageSessionSet({ [WATCHER_KEY]: [] });
}

export function mapChangeInfoCookie(raw: chrome.cookies.Cookie): CookieRecord {
  const partition = (raw as chrome.cookies.Cookie & { partitionKey?: CookieRecord['partitionKey'] })
    .partitionKey;
  return {
    name: raw.name,
    value: raw.value,
    domain: raw.domain,
    path: raw.path,
    secure: Boolean(raw.secure),
    httpOnly: Boolean(raw.httpOnly),
    hostOnly: Boolean(raw.hostOnly),
    session: Boolean(raw.session),
    expirationDate: typeof raw.expirationDate === 'number' ? raw.expirationDate : undefined,
    sameSite:
      raw.sameSite === 'no_restriction' ||
      raw.sameSite === 'lax' ||
      raw.sameSite === 'strict'
        ? raw.sameSite
        : 'unspecified',
    storeId: raw.storeId ?? '0',
    partitionKey: partition?.topLevelSite ? partition : undefined,
  };
}
