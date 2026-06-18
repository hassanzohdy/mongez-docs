---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.2.4]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Added (7) · Fixed (4)</span></summary>

### Added

- **Marketing-style README**. API reference table, 30-second tour, `EnvLoaderOptions` documentation, file-resolution chain, coercion table, and a `Caveats` section that calls out the known sharp edges (`env()` collapsing `null`, `resetEnv` not deleting later-added keys, the quoted-value-with-trailing-comment parse bug).
- **`llms.txt` / `llms-full.txt`**. AI-discoverable index and concatenated reference, matching the `@mongez/atom` shape so the docs aggregator can pick them up.
- **`skills/` folder**. Reference cards for tool-assisted development — `README`, `overview`, `loader` (file resolution + options), `parser` (line/value coercion + interpolation), `recipes`.
- **Vitest test suite**. 56 passing assertions across `parse-line`, `parse-value`, `load-env-file`, `load-env`, and `known-bugs`, covering type coercion, quoted values, `#`-inside-quotes, `${VAR}` interpolation, file resolution under `NODE_ENV`, shared-env layering, override semantics, default-value fallbacks, `env.all()`, and `resetEnv`.
- **CI workflow**. GitHub Actions matrix matching the rest of the `@mongez/*` family: Node 18 / 20 / 22 on Ubuntu, plus Node 20 on Windows.
- **Vitest config**. Self-detecting sibling-alias pattern (no-op today since `@mongez/dotenv` has no `@mongez/*` runtime deps, but the same hook point as the other packages).
- **`package.json` polish**. Expanded `description`, expanded `keywords`, `sideEffects: false`, `test` / `test:watch` scripts wired to vitest.

### Fixed

- **`env(key)` now preserves a deliberately-loaded `null`** (`src/index.ts:174`). The implementation switched from `envData[key] ?? defaultValue` to `key in envData ? envData[key] : defaultValue`, so `env("EST_TIME")` returns `null` when `.env` contains `EST_TIME=null` instead of falling through to the default.
- **`parseValue` correctly handles quoted values that contain `#` and a trailing comment** (`src/index.ts:55-111`). The two-branch slice-then-split logic was replaced with a single quote-aware pass: detect the wrapping quote (one of `"`, `'`, `` ` ``), find the matching closing quote via `lastIndexOf`, take the substring between, then unescape `\<quote>` sequences. Anything after the closing quote (whitespace + `# comment`) is discarded.
- **`loadEnvFile` no longer calls `parseValue` twice per line** (`src/index.ts:150-172`). `parseLine` already runs `parseValue` on the right-hand side, so the loop body now assigns the result directly — removing wasted work and the footgun for any future non-idempotent `parseValue` branch.
- **`resetEnv` now deletes process.env keys added since module load** (`src/index.ts:13`, `src/index.ts:26-44`, `src/index.ts:166-170`). A `loadedKeys: Set<string>` tracks every key written to `process.env` by `loadEnvFile`. On reset, those keys are deleted from `process.env` before the initial-snapshot restore step runs, so reset truly returns the process environment to t0 with respect to anything the loader added. Keys that callers set directly on `process.env` (without going through `loadEnv`) are not tracked and continue to survive reset — the caller owns their own additions.

### Tests

```
56 passed | 0 skipped
```

</details>
