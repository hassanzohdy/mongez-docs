---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.3.0]</span> <span class="cl-date">2026-08-17</span> <span class="cl-counts">Security (1)</span></summary>

### Security

- **`htmlAttributes` keys matching `on*` are now stripped before reaching the DOM** (`src/components/Helmet.tsx:33`). The prop's keys were applied straight to `<html>` via `setAttribute`, and an attribute named `onload` / `onerror` / `onclick` is not inert data — the browser compiles its value into a live inline event handler. So anywhere the *keys* of that object are not fully author-controlled — a CMS "custom `<html>` attributes" field, a settings record spread into the prop, a per-tenant theme config — an attacker who could add one key got script execution on every page the `<Helmet>` rendered. Any key beginning with `on` (case-insensitive) is now dropped; every other key behaves exactly as before, and cleanup on unmount is unchanged.

  **Behaviour change:** if you were intentionally setting an inline handler through `htmlAttributes`, it no longer applies. Attach the listener with `addEventListener` in an effect instead — that path was always the correct one and is unaffected.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.3]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Fixed (5) · Added (5) · Changed (1)</span></summary>

### Fixed

- **`<Helmet>` unmount now restores the prior title / description / keywords / image.** The pre-mount snapshot is now a shallow clone of `getMetaData()` rather than a live reference to `@mongez/dom`'s mutable `currentMetaData` singleton, so cleanup actually reads the pre-mount values. See `src/components/Helmet.tsx:36`.
- **`htmlAttributes` cleanup now removes keys added by the render.** Cleanup now diffs the live `<html>` attribute set against the pre-mount snapshot (excluding `dir`/`lang`, which we intentionally leave alone) and removes any attribute the render introduced before re-applying the snapshot. See `src/components/Helmet.tsx:120-149`.
- **`url={false}` no longer crashes the canonical-url effect.** The component now short-circuits when `pageUrl` is `false`, `null`, or `""`, treating those as "do not touch the canonical url for this page" — matching the existing `HelmetProps.url: boolean | string` type. See `src/components/Helmet.tsx:213-216`.
- **`@mongez/dom`'s `setCanonicalUrl` now writes to the `url` slot instead of `color`.** Fix landed in `@mongez/dom`; `getMetaData("url")` returns the value that was last set, and the Helmet canonical-url cleanup path can now read back the correct prior value. See `../dom/src/metadata.ts:275`.
- **Module-level `document.documentElement` access no longer throws on the server.** Replaced the top-level `const documentElement = document.documentElement` with a lazy `getDocumentElement()` helper that returns `null` when `document` is undefined. Every call site now null-checks; effects only run on the client, so the null branch is dead code in practice — the change exists purely to keep import-time evaluation pure for SSR. See `src/components/Helmet.tsx:19-22`.

### Added

- **First-pass test suite** — 42 happy-dom + `@testing-library/react` tests asserting real DOM output (`document.title`, `document.head.querySelector('meta[...]')`, `<html>` attribute / id / class state).
- **`vitest.config.ts`** — happy-dom environment, `@vitejs/plugin-react`, and a self-detecting sibling alias that resolves `@mongez/dom` from the local monorepo when present and falls back to `node_modules` in CI checkouts.
- **CI** — `.github/workflows/test.yml` running Node 18/20/22 on Ubuntu, Node 20 on Windows, and a React 19 cross-test on Node 20.
- **AI kit** — `llms.txt`, `llms-full.txt`, and `skills/` (`README`, `overview`, `helmet`, `metadata`, `configuration`, `recipes`).
- **`package.json` hygiene** — `sideEffects: false`, expanded `description`, broader `keywords`, `react >= 18` listed as a peer, dev dependencies for the test infra.

### Changed

- **Documentation** — `README.md` rewritten to match the marketing-style format used across the rest of the `@mongez/*` family: tagline, install, 30-second tour, props reference, configuration, examples, related packages, limitations.

### Tests

```
42 tests passing, 0 skipped
```

</details>
