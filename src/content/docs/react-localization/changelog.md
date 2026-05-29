---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

## Unreleased

### Changed

- **`peerDependencies`** widened: `@mongez/localization` now `>=3.0.0` (previously hard-pinned to `3.2.1`, blocking patch-level upgrades without a coordinated bump). `react` now `>=18.0.0` (previously `>=16.8.0`).
- **`devDependencies`** migrated from Jest to Vitest + happy-dom + `@testing-library/react` to match the test stack used by `@mongez/react-atom`. ts-jest, jest-esm-jsx-transform, jest-environment-jsdom, eslint, and prettier toolchain entries removed; vitest, happy-dom, @testing-library/react, @testing-library/dom, @vitejs/plugin-react, @types/react, @types/react-dom added.
- **`package.json`** gained `"sideEffects": false` (the package is pure exports — no top-level side effects, safe to mark for tree-shaking) and a `"description"` that actually describes the JSX converter focus.
- **`scripts`** consolidated to `test` / `test:watch` / `test:coverage`. The old `format:test` / `fix:test` lint-and-format scripts were removed because the matching ESLint/Prettier config files are not committed and the parent `@mongez/*` family doesn't run them in CI.

### Added

- **Vitest test suite** under `src/__tests__/`. 20 active tests across two files (`converters.test.tsx`, `translator.test.tsx`) covering:
  - JSX placeholder substitution into the DOM (strings, numbers, React elements).
  - Multiple placeholders, document-order preservation.
  - Missing-key fallback (placeholder rendered as bare token text).
  - Empty / primitive placeholders bag — converter returns the string unchanged.
  - Double-curly `{{name}}` pattern via custom RegExp.
  - React key warnings — zero warnings on render (deterministic numeric keys per fragment).
  - `transX` returns plain strings without placeholders, falls back to the missing-key keyword, and respects the configured fallback locale.
  - `transX` works regardless of the globally configured converter (the entire reason the function exists).
  - Locale switch via `setCurrentLocaleCode` reflected in subsequent renders (with the explicit caveat that this package does NOT subscribe to locale changes — a parent re-render is required).
  - Count-based pluralization is correctly delegated through to `@mongez/localization`.
- **Vitest config** (`vitest.config.ts`) mirrored from `@mongez/react-atom`: happy-dom environment, sibling-aware aliases for live cross-package dev when the `@mongez/localization`, `@mongez/events`, and `@mongez/reinforcements` source folders exist next to this one.
- **CI workflow** (`.github/workflows/test.yml`) mirroring the matrix `@mongez/react-atom` uses: Node 18/20/22 × Ubuntu, Node 20 × Windows, plus a cross-test against React 19.
- **AI kit**: `llms.txt`, `llms-full.txt`, `skills/` (`README`, `overview`, `jsx-converter`, `trans-x`, `recipes`). Reference cards for AI agents writing React code against this package.

### Fixed

- **`jsxConverter` crashed on `null` / `undefined` placeholders** (`src/converters.tsx:18`). The guard read `typeof placeholders !== "object"` but `typeof null === "object"`, so the short-circuit didn't fire and the subsequent `Object.keys(null)` threw "Cannot convert undefined or null to object". Added an explicit `placeholders == null` check (covers both `null` and `undefined`) ahead of the `typeof` test; the previously `.skip()`'d test in `src/__tests__/converters.test.tsx` is now active. In practice the bug only triggered when callers invoked `jsxConverter` directly — `trans` skips the converter when `placeholders` is falsy.

### Known issues (not fixed in this release)

- **No locale-change subscription**. There is no `useLocale()`, no `useTranslate()`, no `<Translate>` component, no provider. A component that calls `transX(...)` will NOT re-render when `setCurrentLocaleCode(...)` flips the locale code — the parent must trigger a re-render some other way (state, atom, event). This isn't a regression; it's the historical shape of the package. Documented in `README.md` as a limitation along with the **React 18 tearing risk** that a naive `useState + useEffect(localizationEvents.onChange)` implementation would introduce. If future hooks land here, they should use `useSyncExternalStore`.
