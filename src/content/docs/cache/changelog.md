---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.3.4]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Fixed (2) · Added (5)</span></summary>

### Fixed

- **`EncryptedLocalStorageDriver.set` now respects `expiresAfter`** (`drivers/EncryptedLocalStorageDriver.ts`). The driver now wraps every value in a `{data, expiresAt}` envelope before encrypting — matching the plain-driver shape — then decrypts and unwraps on read, applying the same expiry check the plain drivers use. The on-disk cypher format is still a single string, so storage layout is unchanged. **Backward compatibility:** legacy cyphers written by previous releases (raw value, no envelope) are still readable — when the decrypted payload doesn't look like the envelope (`typeof !== "object"`, no `data` key), the driver returns the value as-is with no expiration. Inherited by `EncryptedSessionStorageDriver`.
- **`RunTimeDriver.has(missingKey)` now returns `false`** (`drivers/RunTimeDriver.ts`). `RunTimeDriver.getItem` now returns `null` (instead of `undefined`) for misses, aligning the driver with the Web Storage API contract and fixing `BaseCacheEngine.has()` for this driver. The base engine's `has()` check (`getItem(...) !== null`) was already correct for the other drivers; this change brings RunTimeDriver into line.

### Added

- **Test suite.** 96 vitest unit tests under happy-dom across `PlainLocalStorageDriver`, `PlainSessionStorageDriver`, `EncryptedLocalStorageDriver`, `EncryptedSessionStorageDriver`, `RunTimeDriver`, `CacheManager`, the configuration helpers, and the public-export surface. Total: 96 passing, 0 skipped.
- **AI kit.** `llms.txt`, `llms-full.txt`, and a `skills/` folder (`README`, `overview`, `manager`, `local-storage`, `session-storage`, `runtime`, `encryption`, `custom-drivers`, `recipes`) for tool-assisted development.
- **CI.** GitHub Actions workflow: Node 18/20/22 on Ubuntu, plus Node 20 on Windows.
- **`vitest.config.ts`** modeled on the `@mongez/dom` pattern. happy-dom environment (the Web Storage drivers need it), self-detecting sibling-alias helper (resolves `@mongez/encryption` from the monorepo when present, falls back to `node_modules` in CI), and a shared `setup.ts` that clears both Web Storage backends between tests.
- **`package.json` fields.** `description` (was generic), `keywords` (expanded with driver names, TTL, prefix, persist-adapter), `sideEffects: false`, `scripts.test`, `scripts.test:watch`, and devDependencies for `happy-dom`, `typescript`, `vitest`.

### Tests

```
96 passing, 0 skipped
```

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.4]</span></summary>

(historical — no detailed changelog kept)

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.0]</span> <span class="cl-date">2022-11-11</span></summary>

- Removed `@mongez/encryption` from the runtime dependency closure and moved the encrypt/decrypt pair into `setCacheConfigurations({ encryption })`. The encrypted drivers now require an explicit encryption pair in configuration before use.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.6]</span> <span class="cl-date">2022-11-07</span></summary>

- `valueConverter` and `valueParer` accepted in configuration.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.0]</span> <span class="cl-date">2022-11-04</span></summary>

- `RunTimeDriver` for in-memory caching.
- `PlainSessionStorageDriver` and `EncryptedSessionStorageDriver`.
- Per-entry expiration via `set(key, value, expiresAfter)`.
- `getCacheConfigurations` and `getCacheConfig`.

</details>
