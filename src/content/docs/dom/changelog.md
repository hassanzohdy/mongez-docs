---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.2.5]</span> <span class="cl-date">2026-08-17</span> <span class="cl-counts">Security (1)</span></summary>

### Security

- **`htmlToText` now parses in an inert document** (`src/htmlToText.ts`). It built the text by assigning the input to `innerHTML` on an element owned by the live `document`. Detaching that element is not protection: the assignment still starts resource fetches and can fire their handlers, so `htmlToText('<img src=x onerror=alert(1)>')` executed script. The function's entire purpose is stripping markup out of untrusted HTML — API descriptions, CMS bodies, user content — so every call site was passing exactly the input that triggers it. Parsing now happens inside `document.implementation.createHTMLDocument("")`, which has no browsing context and is therefore never "fully active", so `onerror`/`onload` handlers are never dispatched. Return value for ordinary input is unchanged.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.4]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Fixed (3) · Removed (1) · Added (5)</span></summary>

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

### Tests

```
81 passing, 0 skipped
```

</details>
