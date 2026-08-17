---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.2.4]</span> <span class="cl-date">2026-08-17</span> <span class="cl-counts">Security (1)</span></summary>

### Security

- **Prototype pollution through bracket-notation keys in `toObjectParser`** (`src/query-string-parsers.ts:5`, `:11`, `:49`). Nested keys were walked by assigning into plain `{}` accumulators, so `?__proto__[isAdmin]=1` and `?constructor[prototype][isAdmin]=1` wrote through to `Object.prototype`. Every object in the page then reads `isAdmin` as `"1"` — including objects consuming apps use for feature gates and authorization decisions — and the value survives until reload. The input here is a URL, so a crafted link is the entire attack. `__proto__`, `constructor` and `prototype` are now rejected as key segments, and every accumulator the parser creates uses `Object.create(null)`, so no nesting level can resolve to a prototype in the first place. Ordinary keys are unaffected.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.3]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Fixed (3) · Added (5)</span></summary>

### Fixed

- **`toStringParser` now percent-encodes values.** Values containing `&`, `=`, or other reserved characters are run through `encodeURIComponent` so the output round-trips cleanly through `parse`. Keys remain unencoded so the `key[sub]` / `key[]` bracket syntax keeps working. Fix at `src/query-string-parsers.ts:55-60`; previously-skipped tests in `src/__tests__/serialize.test.ts` ("percent-encoding") are now enabled.
- **`toStringParser` now serializes `null` as the literal `null`.** A `value === null` short-circuit runs before the `typeof === "object"` branch so the key no longer disappears. Fix at `src/query-string-parsers.ts:55`; the previously-skipped serialize test now passes. Note: this is an asymmetric round-trip — `parse("v=null")` yields `{ v: "null" }` (string) because the parser has no way to distinguish typed null from the four characters of `"null"`.
- **`toObjectParser` no longer writes the string `"undefined"` for a key with no `=`.** When `pair[1]` is `undefined`, the value is now set to `""` instead of being fed into `decodeURIComponent`. Fix at `src/query-string-parsers.ts:14`; the previously-skipped parse test now passes.

### Added

- **Test suite.** 90 vitest unit tests under happy-dom across `parse`, `serialize`, the lower-level `parsers`, and the browser-bound `all` / `get` / `update` / `toString` methods. Total: 90 passing, 0 skipped.
- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `parse`, `serialize`, `recipes`) for tool-assisted development.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** based on the @mongez/atom pattern. happy-dom environment (because `queryString.all()` defaults to `window.location.search` and `queryString.update()` calls `history.replaceState`), self-detecting sibling-alias helper (currently no aliases — kept for future use).
- **`package.json` fields.** Real `description` (was a stub flagged during workspace migration), expanded `keywords` (`querystring`, `query-string`, `url`, `parse`, `serialize`, `stringify`, `search-params`, `nested`, `mongez`), `sideEffects: false`, `scripts.test`, `scripts.test:watch`, and devDependencies for `happy-dom`, `typescript`, `vitest`. Version bumped from `0.0.1` (stub) to `1.0.0`.

### Tests

```
90 passing, 0 skipped
```

</details>
