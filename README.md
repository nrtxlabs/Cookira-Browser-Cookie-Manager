# Cookira — Browser Cookie Manager

Local-first, zero-telemetry **Dual-Target (Chromium MV3 & Firefox WebExtension)** browser cookie manager designed with a **Cyberpunk / Terminal Neon** aesthetic and automatic browser Dark/Light theme synchronization.

> **Security Warning:** Cookies may contain sensitive authentication tokens and website session IDs. Always handle exported cookie files and raw values carefully—if a session ID is leaked, attackers can replay your session and hijack your accounts. Use **Encrypted Vault** (`.cookira.enc.json`) when transferring cookies across devices, and only import payloads from trusted sources.

## Features

- **Simple & Advanced Workspace Modes**: Switch between compact **Simple** mode (fast everyday cookie lookup, creation, export/import, and collapsible advanced attributes) and full **Advanced** mode (filter chips, sorting, Profiles, Domain Lock, Live Watcher, and full RFC 6265 attribute chips) right from the header.
- **Core Cookie Editor (`Popup`, `Side Panel`, `Full-Tab Studio`)**:
  - View, search (`/`), filter (`All`, `HttpOnly`, `Secure`, `Session`, `Expired`), sort (`Name`, `Size`, `Expiry`), create, edit, copy, and delete cookies.
  - Enforces RFC 6265 / Chromium MV3 invariants: `__Host-` (`Secure + Path=/ + HostOnly`), `__Secure-`, `SameSite=None + Secure`, accurate `HostOnly` preservation (omitting `domain` in `cookies.set`), and CHIPS `partitionKey` support.
  - **Smart Value Inspector (Read-Only)**: Automatically decodes JWT headers/claims, JSON, URL-encoded strings, and Base64 UTF-8 values without mutating raw cookie payloads.
  - **Domain Health Bar**: Real-time cookie header byte-size monitor with warning thresholds near the 8 KB `HTTP 431` boundary.
- **Multi-Format Export & Smart Import**:
  - Export to **Standard JSON**, **Playwright / NRTX Runner JSON** (`.cookies.json`), **Netscape `.txt`** (`#HttpOnly_` aware), **HTTP `Cookie:` Header**, **cURL Command** (`.sh`), **Python `requests` Dict** (`.py`), or **AES-256-GCM Encrypted Vault** (`.cookira.enc.json`, PBKDF2 SHA-256 `600,000` iterations).
  - Import via paste, drag & drop, or file upload with auto-format detection, **Pre-Import Diff** (`New`, `Overwrite`, `Invalid`), and **Merge** vs **Replace Scope** (backed by automatic rollback snapshot).
- **Session Profiles, Privacy & Live Telemetry**:
  - **1-Click Account Profile Switcher**: Save domain cookie snapshots and switch accounts instantly with Undo protection.
  - **Domain Lock**: Lock critical domains against accidental edits or deletions.
  - **Live Cookie Watcher**: Real-time `cookies.onChanged` event log persisted via `storage.session`, with mutation `cause` filter (`explicit`, `overwrite`, `expired`, `evicted`) and metadata-only Audit JSON export (omitting raw cookie secrets).
  - **Auto-Clean Whitelist**: Disabled by default, supports glob `*` wildcards (e.g., `*.tracker.example`), includes Dry-Run Preview, and never touches locked or whitelisted domains.
- **Automatic Theme Sync**: Defaults to `System (Auto)` following the browser/OS Dark or Light color scheme in real time, with manual `Dark Neon` and `Light Ink` overrides in Settings (`Alt+S`).

## Quick Start (Windows / macOS / Linux)

```bash
npm install
npm run build
```

This generates ready-to-load unpacked extension folders:
- **Chromium (Chrome / Edge / Brave)**: `dist/chrome/`
- **Firefox**: `dist/firefox/`

To also generate cross-platform release `.zip` archives under `release/`:

```bash
npm run pack
```

## Loading the Extension in Browser

### Chrome / Edge / Brave
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `dist/chrome/`.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `dist/firefox/manifest.json`.

## Verification Suite

```bash
npm run verify
```

Runs:
1. `npm run typecheck` (`tsc --noEmit`)
2. `npm test` (Vitest unit suite covering cookie rules, codecs, encrypted vault, value inspector, manifest & auto-clean safety)
3. `npm run build` (Dual Vite production build for Chromium MV3 & Firefox)
4. `npm run test:e2e` (Real Chromium unpacked extension E2E test using Playwright & isolated `os.tmpdir()`)

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+K` / `Cmd+Shift+K` | Open Cookira Popup |
| `/` | Focus Cookie Search |
| `Ctrl+E` / `Cmd+E` | Open Export Modal |
| `Ctrl+I` / `Cmd+I` | Open Import Modal |
| `Alt+S` | Toggle Settings Modal |
| `Esc` | Close Active Modal / Back to List |
