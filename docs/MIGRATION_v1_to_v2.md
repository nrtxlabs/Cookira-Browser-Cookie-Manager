# Migrating Cookira v1.x to v2.0.0

## Overview

Cookira `v2.0.0` introduces authenticated vault metadata (`AES-GCM` AAD in Vault v2), `CookiraSettings` schema `v2` (`preferredStoreFilter` + Firefox/Incognito store badges), and clean backward-compatibility readers so upgrading preserves your saved sessions and protection rules.

## Breaking Changes

1. **Encrypted Vault Format Upgraded to `version: 2` (AAD Authenticated)**
   - **What changed**: `encryptCookiesVault` and `encryptProfilesVault` now emit `"version": 2`, `"exportedBy": "cookira-v2"`, and bind `vaultKind` and `domain` via Web Crypto `AES-GCM` `additionalData` (`cookira-vault:v2:<kind>:<domain>`).
   - **Impact**: `.cookira.enc.json` and `.cookira-profiles.enc.json` files exported by Cookira `v2.0.0` **cannot** be opened by Cookira `v1.0.x`–`v1.2.x` builds.
   - **Backward compatibility**: Cookira `v2.0.0` continues to decrypt legacy `version: 1` vaults created in `v1.x`.

2. **Settings Backup Envelope Upgraded to `version: 2`**
   - **What changed**: `CookiraSettings` now carries `schemaVersion: 2` and `preferredStoreFilter` (`'all'` by default, persisting active container/incognito store selection). `exportSettingsJson` now emits `"version": 2`.
   - **Impact**: Exporting settings from `v2.0.0` targets `v2` consumers, while `v2.0.0` cleanly migrates `v1` local storage settings and `version: 1` `.cookira-settings.json` backups on load.

## Step-by-Step Upgrade Checklist

1. **Optional Safeguard**: Before replacing your unpacked extension or reinstalling from Release `.zip`, export a backup of your Session Profiles (`Profiles` -> `Encrypted Export`) and Settings (`Settings` -> `Export Settings`).
2. **Build or Install v2.0.0**:
   - **From Release**: Download `cookira-chrome-v2.0.0.zip` or `cookira-firefox-v2.0.0.zip` from GitHub Releases and extract into your extension folder.
   - **From Source**:
     ```bash
     git pull origin main
     npm install
     npm run verify
     npm run build
     ```
3. **Reload Extension**:
   - **Chromium**: Visit `chrome://extensions`, click **Reload** (or load `dist/chrome/`).
   - **Firefox**: Visit `about:debugging#/runtime/this-firefox` and reload `dist/firefox/manifest.json`.
4. **Verify Migration**: Open Cookira -> **Settings** (`Alt+S`) to confirm your `lockedDomains`, `protectedWhitelist`, and `autoCleanRules` carried over intact.

## Compatibility Guarantees

- **Legacy v1 Vaults**: Any `version: 1` `.cookira.enc.json` or `.cookira-profiles.enc.json` created with Cookira `v1.x` decrypts cleanly in `v2.0.0`.
- **Re-encrypting to v2**: After importing a `v1` vault into `v2.0.0`, re-export it if you want `AES-GCM` AAD protection against envelope metadata tampering (`domain`, `vaultKind`, or `version` downgrade).
