# Changelog

All notable changes to **Cookira — Browser Cookie Manager** will be documented in this file.

## [1.2.0] - 2026-11-15

### Added
- **Glob Wildcard Domain Matching**: Added linear-time `domainMatchesPattern` matcher (`src/core/cookieUrl.ts`) supporting glob `*` wildcards (e.g., `*.tracker.example`, `ads-*.net`) across Auto-Clean rules, `lockedDomains`, and `protectedWhitelist`.
- **Live Watcher Cause Filtering & Metadata Audit Export**: Added mutation cause dropdown (`all`, `explicit`, `overwrite`, `expired`, `evicted`, `expired_overwrite`) and `Export JSON` audit download in `LiveWatcherPanel` (metadata-only export omitting raw cookie values for session safety).

## [1.1.0] - 2026-11-14

### Added
- **cURL & Python `requests` Export Snippets**: Added shell-escaped POSIX `curl -b` snippet export and Python `requests` cookie dictionary generator (`src/codecs/snippetCodec.ts`).
- **1-Click Clone Cookie**: Added `Clone` button in `CookieEditorPanel` to duplicate an existing cookie into a fresh `_copy` draft without retyping attributes.
- **Encrypted Account Profile Backup**: Added `AES-256-GCM + PBKDF2` encrypted export/import (`.cookira-profiles.enc.json`) inside `ProfilesModal`.

## [1.0.2] - 2026-11-13

### Changed
- **Modular App Architecture**: Extracted `useWorkspaceCallbacks` hook from `App.tsx`, keeping every file under `src/` strictly modular (`<= 300` lines).
- **Accessibility & Diagnostics**: Added high-contrast `:focus-visible` keyboard focus rings across buttons, selects, and inputs, plus live manifest version readout (`getExtensionVersion()`).

## [1.0.1] - 2026-11-12

### Added
- **Simple vs Advanced Interface Modes**: Added a quick `Simple | Advanced` switcher in the header and Settings modal. `Simple` mode keeps the popup/side-panel ultra-compact with essential search, Add/Export/Import/Clear actions, 2-line cookie cards, and collapsible `Advanced Attributes` in the editor; `Advanced` mode exposes Profiles, Domain Lock, Live Watcher, filters, sort, and full attribute chips.

### Fixed
- **Narrow Side Panel `+ Add` / Edit Navigation**: Replaced static surface-only split layout checks with a responsive viewport check (`useIsWideViewport`) so clicking `+ Add` or selecting a cookie in the narrow browser Side Panel opens the editor cleanly at the top of the viewport with a `List` back button instead of rendering below the cookie list.
- **Form Validation Timing**: Delayed empty-name validation errors until the user interacts with or submits the cookie form so `New Cookie` opens cleanly.

## [1.0.0] - 2026-11-12

### Added
- **Dual-Target Extension Architecture**: Single source tree compiling to both Chromium MV3 (`dist/chrome/`) and Firefox WebExtension MV3 (`dist/firefox/`), plus cross-platform ZIP packager (`npm run pack`).
- **Cyberpunk / Terminal Neon UI & Browser Theme Sync**: Automatic `System (Auto)` synchronization following browser/OS Dark and Light color schemes in real time, plus manual `Dark Neon` and `Light Ink` overrides in Settings.
- **Core Cookie Editor (`Popup`, `Side Panel`, `Full-Tab Studio`)**: View, search (`/`), filter (`All`, `HttpOnly`, `Secure`, `Session`, `Expired`), sort, create, edit, copy, and delete cookies with strict `__Host-`, `__Secure-`, `SameSite=None + Secure`, `HostOnly`, and CHIPS `partitionKey` validation.
- **Smart Value Inspector**: Read-only automatic decoding preview for JWT headers/claims, JSON payloads, URL-encoded values, and Base64 UTF-8 strings.
- **Multi-Format Export & Smart Import**: Bidirectional codecs for Standard JSON, Playwright / NRTX Runner JSON, Netscape `.txt` (`#HttpOnly_` aware), and HTTP `Cookie:` headers, with Pre-Import Diff (`New`, `Overwrite`, `Invalid`) and Merge/Replace rollback safety.
- **Account Profiles & Encrypted Vault**: 1-click domain session profile snapshots (`Switch`, `Rename`, `Delete`) and password-protected `AES-256-GCM + PBKDF2 (600k)` `.cookira.enc.json` vault export/import.
- **Privacy, Safety & Telemetry**: Domain Lock, `storage.session`-backed Undo Stack, Live `cookies.onChanged` Watcher, Domain Health header byte-size monitor, built-in English session-hijacking security notices across Editor/Export/Import/Profiles, and opt-in Auto-Clean Whitelist with Dry-Run Preview.