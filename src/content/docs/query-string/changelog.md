---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

## Unreleased

### Fixed

- **`toStringParser` now percent-encodes values.** Values containing `&`, `=`, or other reserved characters are run through `encodeURIComponent` so the output round-trips cleanly through `parse`. Keys remain unencoded so the `key[sub]` / `key[]` bracket syntax keeps working. Fix at `src/query-string-parsers.ts:55-60`; previously-skipped tests in `src/__tests__/serialize.test.ts` ("percent-encoding") are now enabled.
- **`toStringParser` now serializes `null` as the literal `null`.** A `value === null` short-circuit runs before the `typeof === "object"` branch so the key no longer disappears. Fix at `src/query-string-parsers.ts:55`; the previously-skipped serialize test now passes. Note: this is an asymmetric round-trip — `parse("v=null")` yields `{ v: "null" }` (string) because the parser has no way to distinguish typed null from the four characters of `"null"`.
- **`toObjectParser` no longer writes the string `"undefined"` for a key with no `=`.** When `pair[1]` is `undefined`, the value is now set to `""` instead of being fed into `decodeURIComponent`. Fix at `src/query-string-parsers.ts:14`; the previously-skipped parse test now passes.

### Behaviour contracts (intentionally unchanged)

- **`queryString.get(key, default)` returns the default for any falsy value.** Implementation is `all[key] || defaultValue`, so `0`, `""`, and `false`-shaped values fall through. Documented in a regular (non-skipped) test as a behavior contract rather than a fix target, since changing it would silently break callers.

### Added

- **Test suite.** 90 vitest unit tests under happy-dom across `parse`, `serialize`, the lower-level `parsers`, and the browser-bound `all` / `get` / `update` / `toString` methods. Total: 90 passing, 0 skipped.
- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `parse`, `serialize`, `recipes`) for tool-assisted development.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** based on the @mongez/atom pattern. happy-dom environment (because `queryString.all()` defaults to `window.location.search` and `queryString.update()` calls `history.replaceState`), self-detecting sibling-alias helper (currently no aliases — kept for future use).
- **`package.json` fields.** Real `description` (was a stub flagged during workspace migration), expanded `keywords` (`querystring`, `query-string`, `url`, `parse`, `serialize`, `stringify`, `search-params`, `nested`, `mongez`), `sideEffects: false`, `scripts.test`, `scripts.test:watch`, and devDependencies for `happy-dom`, `typescript`, `vitest`. Version bumped from `0.0.1` (stub) to `1.0.0`.

### Changed

Nothing in the runtime surface.

### Removed

Nothing.

### Tests

```
90 passing, 0 skipped
```
