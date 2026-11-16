export type SameSiteStatus = 'no_restriction' | 'lax' | 'strict' | 'unspecified';

export interface CookiePartitionKey {
  topLevelSite?: string;
  hasCrossSiteAncestor?: boolean;
}

export interface CookieRecord {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  hostOnly: boolean;
  session: boolean;
  expirationDate?: number;
  sameSite: SameSiteStatus;
  storeId: string;
  partitionKey?: CookiePartitionKey;
}

export interface CookieIdentityKey {
  name: string;
  domain: string;
  path: string;
  storeId?: string;
  partitionKey?: CookiePartitionKey;
}

export interface CookieDraft {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  hostOnly: boolean;
  session: boolean;
  expirationDate?: number;
  sameSite: SameSiteStatus;
  storeId?: string;
  partitionKey?: CookiePartitionKey;
  originalKey?: CookieIdentityKey;
}

export type ExportFormat = 'json' | 'netscape' | 'header' | 'encrypted';
export type DefaultExportFormat = 'json' | 'netscape' | 'header';
export type ExportScope = 'domain' | 'filtered' | 'selected' | 'all';
export type ImportMode = 'merge' | 'replace';
export type DetectedImportFormat = 'json' | 'netscape' | 'header' | 'encrypted' | 'unknown';

export interface ImportPreviewItem {
  index: number;
  draft: CookieDraft;
  status: 'new' | 'overwrite' | 'invalid';
  errors: string[];
}

export interface SessionProfile {
  id: string;
  name: string;
  domain: string;
  includeSubdomains: boolean;
  createdAt: number;
  updatedAt: number;
  cookies: CookieRecord[];
}

export type ThemeMode = 'system' | 'dark' | 'light';
export type UiDensityMode = 'simple' | 'advanced';

export interface AutoCleanRule {
  id: string;
  domainPattern: string;
  trigger: 'startup' | 'tab_close';
  enabled: boolean;
}

export interface CookiraSettings {
  schemaVersion: 2;
  themeMode: ThemeMode;
  uiMode: UiDensityMode;
  preferredStoreFilter: string;
  defaultExportFormat: DefaultExportFormat;
  includeSubdomainsByDefault: boolean;
  confirmBeforeDelete: boolean;
  autoDecodeInspector: boolean;
  watcherEnabled: boolean;
  watcherMaxEvents: number;
  lockedDomains: string[];
  protectedWhitelist: string[];
  autoCleanEnabled: boolean;
  autoCleanRules: AutoCleanRule[];
}

export interface UndoSnapshot {
  id: string;
  label: string;
  domain: string;
  createdAt: number;
  previousCookies: CookieRecord[];
  appliedKeys: CookieIdentityKey[];
}

export interface WatcherEvent {
  id: string;
  timestamp: number;
  removed: boolean;
  cause: string;
  cookie: CookieRecord;
}

export type SurfaceMode = 'popup' | 'sidepanel' | 'dashboard';
export type BrowserTarget = 'chrome' | 'firefox';

export interface CookieStoreInfo {
  id: string;
  tabIds: number[];
  incognito?: boolean;
  label?: string;
  containerColor?: string;
}
