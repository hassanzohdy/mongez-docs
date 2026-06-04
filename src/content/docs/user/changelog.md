---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


<details class="changelog-version" open>
<summary><span class="cl-version">[Unreleased]</span> <span class="cl-counts">Added (7) · Fixed (4) · Changed (type-only break, runtime unchanged) (1) · Notes (2)</span></summary>

### Added

- Marketing-style `README.md` documenting the full public API: `User` base class, `UserEventsListener`, `setCurrentUser` / `getCurrentUser`, `UserInterface`, `UserInfo`, `UserCacheDriverInterface`.
- AI-agent skill cards under `skills/` covering the user manager, cache drivers, events, permissions, the current-user pointer, and end-to-end recipes.
- `llms.txt` and `llms-full.txt` for LLM-facing documentation discovery.
- Vitest suite under `src/__tests__/` covering login/logout transitions, access-token handling, dot-notation get/set, cache driver hydration on `boot()`, permissions checks, and event triggers.
- `vitest.config.ts` (Node environment) with monorepo-aware sibling resolution.
- GitHub Actions CI workflow at `.github/workflows/test.yml` running the matrix Node 18 / 20 / 22 on Ubuntu plus Node 20 on Windows.
- `package.json`: `sideEffects: false`, `scripts.test` / `scripts.test:watch`, `description`, expanded `keywords`, and `devDependencies` for `vitest` and `typescript`.

### Fixed

- `UserEventsListener.onBoot()` now subscribes to the `boot` topic (previously subscribed to `logout`, so callbacks registered via `onBoot` never fired from a real boot). (`src/user-events-listener.ts:16`)
- `UserEventsListener.onKeyChange()` now subscribes to the `keyChange` topic (previously subscribed to `logout`). (`src/user-events-listener.ts:53`)
- `User.update()` now emits the correct previous value as `oldValue` to `keyChange` listeners. Previously `this.userData` was reassigned before the per-key loop ran, so `this.get(key)` inside the loop returned the new value, making `oldValue` identical to `newValue`. The previous data is now captured before the assignment and indexed inside the loop. (`src/user-manager.ts:170-174`)
- `User.update()` no longer mutates the caller's `userData` argument. The input is now cloned at the top of the method, so writing the preserved access token back is done on the clone rather than the caller's object. (`src/user-manager.ts:163`)

### Changed (type-only break, runtime unchanged)

- `getCurrentUser()` now returns `User | undefined` instead of `User`. The runtime always returned `undefined` before `setCurrentUser` was called; the type now reflects that. Consumers must handle the undefined case (e.g. `getCurrentUser()?.isLoggedIn()` or an `if (user)` guard). (`src/current-user.ts:3,19`)

### Notes

- Public method signatures on `UserManager` are unchanged. Public function signatures of `onBoot` / `onKeyChange` / etc. are unchanged. The only signature change is the return type of `getCurrentUser`, documented above.
- No runtime dependencies were added.

</details>
