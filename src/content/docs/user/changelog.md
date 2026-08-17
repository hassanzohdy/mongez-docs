---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


<details class="changelog-version" open>
<summary><span class="cl-version">[1.2.0]</span> <span class="cl-date">2026-08-17</span> <span class="cl-counts">Security (1)</span></summary>

Security release with a **behaviour change to `can()`**. Read the item below before upgrading — permission checks that used to pass may now fail, and that is the point.

### Security

- **`can()` now fails closed: only an explicit boolean `true` grants access** (`src/user-manager.ts:266`). The check was `get(this.permissions, permission)` evaluated for truthiness, so *any* truthy leaf granted the permission — including values that were never intended as a grant. `can("posts")` returned `true` when `permissions.posts` was the nested object `{ create: false, delete: false }` (a non-empty object is truthy), i.e. a permission map that denies everything granted the parent permission. The same held for `"0"`, `"false"`, `1`, a non-empty array, or any object a server happened to send in that slot. The comparison is now `=== true`.

  **This is a behaviour change and it can deny users who were previously allowed.** If your permissions come from an API that sends `1`/`0`, `"true"`/`"false"`, or nested objects, normalize them to real booleans before `setUserData`/`update`, or override `can()` in your `User` subclass. The default is deliberately the strict one: an authorization check that guesses is worse than one that says no, because the failure is silent and grants access rather than withholding it.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.6]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Added (7) · Fixed (4) · Changed (1)</span></summary>

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

### Changed

- `getCurrentUser()` now returns `User | undefined` instead of `User`. The runtime always returned `undefined` before `setCurrentUser` was called; the type now reflects that. Consumers must handle the undefined case (e.g. `getCurrentUser()?.isLoggedIn()` or an `if (user)` guard). (`src/current-user.ts:3,19`)

</details>
