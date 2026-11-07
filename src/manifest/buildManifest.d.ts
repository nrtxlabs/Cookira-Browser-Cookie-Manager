export declare const ICON_PATHS: Record<'16' | '32' | '48' | '128', string>;

export declare function buildExtensionManifest(
  target: 'chrome' | 'firefox',
  version?: string,
): Record<string, unknown>;
