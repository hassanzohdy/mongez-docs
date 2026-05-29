---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

## Unreleased

### Fixed

- `setFavIcon` now writes to `currentMetaData.favIcon` (previously wrote to `currentMetaData.color`). `getMetaData("favIcon")` now reflects the last value passed to `setFavIcon` (`metadata.ts:249`).
- `setCanonicalUrl` now writes to `currentMetaData.url` (previously wrote to `currentMetaData.color`). `getMetaData("url")` now reflects the last value passed to `setCanonicalUrl` (`metadata.ts:275`).
- `setPageColor` now emits `<meta name="theme-color">` per the HTML spec (previously emitted `<meta property="theme-color">`, which user agents ignore). Fixed by adding `"theme-color"` to the `name=` special-case list in `meta()` (`metadata.ts:107`).

### Removed

- Deleted the orphan `src/elments.ts` file (misspelled name intentional). It declared a private `attributesList(domElement)` helper that was never exported from `src/index.ts`. Equivalent behaviour is already available via `getElementAttributes` in `src/metadata.ts`.

### Added

- **Test suite.** 81 vitest unit tests under happy-dom across `metadata`, `css-variable`, `dimensions`, `htmlToText`, `loadScript`, `prefers-dark-mode`, `pressed`, `scrollTo`, `fonts`, and the package-level `index`. Total: 81 passing, 0 skipped.
- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `metadata`, `head-elements`, `assets`, `interactions`, `recipes`) for tool-assisted development.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** based on the @mongez/react-atom pattern. happy-dom environment, self-detecting sibling-alias helper (currently no aliases — kept for future use), and `disableJavaScriptFileLoading` / `disableCSSFileLoading` / `disableIframePageLoading` happy-dom settings so absolute-URL `<link>` and `<script>` tags don't trigger real network calls during the test run.
- **`package.json` fields.** `description` (was generic), `keywords` (expanded), `repository`, `sideEffects: false`, `scripts.test`, `scripts.test:watch`, and devDependencies for `happy-dom`, `typescript`, `vitest`.

### Changed

Nothing in the runtime surface.

### Tests

```
81 passing, 0 skipped
```
