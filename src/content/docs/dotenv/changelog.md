---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.3.2]</span> <span class="cl-date">2026-08-17</span> <span class="cl-counts">Security (1)</span></summary>

### Security

- **`dir` and `envPath` are now rejected when they contain `..` segments** (`src/index.ts`). Both are fed straight to `readFileSync`, so a relative path carrying `..` read a file outside the directory the loader was pointed at — and every value it parsed was then written into `process.env`, where the rest of the process trusts it. That matters wherever either option is derived rather than hard-coded: a per-tenant config directory, a CLI flag, a build variable. Any path with a `..` segment now throws with the offending value named, instead of silently loading whatever it landed on.

  Absolute paths are deliberately still allowed: passing one is the caller explicitly naming the exact file, which is the documented way to point this loader anywhere on disk. The guard closes the case where a *relative* path was expected and traversal changed the answer.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.3.1]</span> <span class="cl-date">2026-08-10</span> <span class="cl-counts">Fixed (3) · Tests (2)</span></summary>

Follow-up to the 1.3.0 review by @Ion. Narrows numeric coercion so it can no longer corrupt identifier-shaped values. Every value this stops converting was being **corrupted, not served**.

### Fixed

- **Numeric coercion now requires an exact round trip** (`src/index.ts`). `isNumeric` changed from `!isNaN(value)` to `Number.isFinite(Number(value)) && String(Number(value)) === value`: a value becomes a number only when converting it back yields the original characters. Applied to **both** call sites — `parseValue` (`.env` files) and `coerceProcessValue` (`process.env`) — so the two sources cannot drift apart.

  | Value | Was | Now |
  |---|---|---|
  | `0123456789` | `123456789` — leading zero destroyed | `"0123456789"` |
  | `1234567890123456789` | `1234567890123456800` — past `MAX_SAFE_INTEGER` | `"1234567890123456789"` |
  | `0x1F` | `31` | `"0x1F"` |
  | `1e5` | `100000` | `"1e5"` |
  | `+15551234567` | `15551234567` — `+` stripped | `"+15551234567"` |
  | `1.50` | `1.5` — significant trailing zero dropped | `"1.50"` |
  | `Infinity` | `Infinity` — no longer a string | `"Infinity"` |
  | `NaN` | `"NaN"` (unchanged, but see below) | `"NaN"` |

  Genuine numbers (`3000`, `1.5`, `-2`, `0`) round-trip and still coerce.

  **Why this became urgent in 1.3.0 specifically.** The coercion rule itself is old, but until 1.3.0 it only applied to `.env` files, where an author can opt out by quoting the value (`parseValue` returns early on quotes, before the numeric branch). 1.3.0 applied the same rule to `process.env`, and `coerceProcessValue` deliberately never strips quotes — correctly, since a quote in a real environment variable belongs to the secret. The net effect was that a value injected by Docker or Kubernetes had **no opt-out at all**, and injected secrets, account IDs and tokens are exactly the values that look numeric. Round-tripping removes the need for an escape hatch.

  Two refinements beyond the reviewed one-liner, both verified empirically rather than reasoned about:
  - **`Number.isFinite`, not a plain NaN check.** The bare round trip `String(Number(v)) === v` accepts the string `"NaN"` (`String(Number("NaN"))` is `"NaN"`), which would have started coercing a value that is a string today — a new corruption introduced by the fix, and `NaN` is especially bad to leak since it compares unequal to itself.
  - **`Infinity` is closed too.** It round-trips, so the reviewed one-liner would have left it coercing even though the review's own table lists it as a corruption to fix. `Number.isFinite` closes that row and `-Infinity` with it.

### Tests

- New `src/__tests__/numeric-coercion.test.ts` (26 assertions). Every row above is asserted from a `.env` file **and** from `process.env`; a final test compares the two result sets directly so the sources can never diverge. `0123456789` is pinned in its own regression test — it is the case an operator cannot defend against.
- New direct coverage for the `loadedKeys` half of `isProcessProvided` in `src/__tests__/process-env.test.ts`. The two halves of the test leave `process.env.APP_MODE` in an identical state and differ only in **who** wrote it; the outcomes are opposite. Removing the `loadedKeys` check makes them agree and the test fails — previously this invariant was only covered indirectly through the precedence tests.

```
104 passed | 0 skipped
```

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.3.0]</span> <span class="cl-date">2026-08-10</span> <span class="cl-counts">Added (5) · Fixed (3) · Docs (2)</span></summary>

Four defects reported on 2026-08-10, all at the boundary between a `.env` file and the real process environment. Every change here only affects cases that were previously **wrong**; no currently-working configuration changes behaviour.

### Added

- **`precedence` option — who wins when a key is in both the file and `process.env`** (`src/index.ts`). New exported type `EnvPrecedence = "file-wins" | "process-wins"`, available as `EnvLoaderOptions.precedence` and as an optional third argument to `loadEnvFile(envPath, override, precedence?)`.
  - `"file-wins"` (**the default, unchanged**) — the `.env` file value replaces whatever was already in `process.env`, in the store and in `process.env` itself. This is the historical behaviour, and it is the deployment hazard: a `.env` file baked into a container image silently overwrites the `DATABASE_URL`, port, or secret that Docker / Kubernetes / CI injected. It stays the default for the whole v1.x line so a minor bump can never change what a running deployment reads.
  - `"process-wins"` — an already-set `process.env` value is authoritative: the file neither replaces it in the store nor writes over it. The file becomes a fallback layer underneath the real environment, matching `dotenv`, `dotenv-flow`, Vite and Next.
  - Keys the loader itself wrote earlier in the same run (`.env.shared`, or a previous `loadEnvFile`) are tracked via the existing `loadedKeys` set and are **not** mistaken for platform-injected values, so file layering keeps working under `"process-wins"`.
  - **v2.0 will flip the default to `"process-wins"`.** That is a breaking change to which value a running production application reads, so it gets its own release and does not ride along with anything else.

### Fixed

- **`env()` now falls back to `process.env` before the default** (`src/index.ts`). Lookup order is now **loaded store → `process.env` → `defaultValue`**. Previously `envData` was populated only by parsing `.env` files and `process.env` was never consulted, so a variable that existed in the real environment but in no file was invisible to `env()` forever — and before any `loadEnv()` call the store was empty, so *every* lookup returned its default, including `env("NODE_ENV")` while `process.env.NODE_ENV` was set. Values taken from `process.env` are coerced to primitives the same way file values are (`"8080"` → `8080`, `"true"` → `true`), so a key's type does not depend on where it came from; that coercion is deliberately narrower than `parseValue` — no quote stripping, no `${VAR}` interpolation, and values with significant leading/trailing whitespace pass through untouched, because a real environment variable is a literal value. `env.all()` still returns the loaded store only and is not merged with `process.env`.
- **`${VAR}` interpolation resolves `process.env` and throws instead of emitting the literal string `"undefined"`** (`src/index.ts`). Resolution order is the internal store, then `process.env`, then a thrown error naming the key. Previously the replacement callback returned `undefined` for an unresolved key, which `String.prototype.replace` coerced into the four-character string `"undefined"` and baked into the value — `DB_URL=postgres://${DB_HOST}/app` produced `postgres://undefined/app` with no warning. That is value corruption rather than a missing value: the app starts, then fails much later with a connection error pointing at a host called `undefined`, far from the cause. Forward references (a key declared later in the same file) remain unsupported and now throw with a message that says so.
- **`loadEnv()` no longer throws when the directory has no `.env` file at all** (`src/index.ts`). The derived path — `.env.${NODE_ENV}` falling back to `.env` — is now checked before `loadEnvFile` is called, matching the guard that already existed for `.env.shared`. A project that gets everything from injected variables is a normal, supported state and no longer needs a caller-side guard. A path passed **explicitly** as `envPath` still throws when missing: the caller named it, so a typo must be loud. `loadEnvFile` itself is unchanged — it is the primitive and never guesses.

### Docs

- README gains a `precedence` section (with the deployment warning and the v2.0 note), the updated `env()` lookup order, the throwing-interpolation contract, the optional-derived-path rule, and a "Let the platform's injected values win" recipe replacing the old read-only-mode-as-orchestrator-fallback advice, which did not actually do what it claimed.
- `skills/overview`, `skills/loader`, `skills/parser`, `skills/recipes`, `llms.txt`, and `llms-full.txt` updated to match. `llms-full.txt`'s "Known limitations" section was also stale since 1.2.4 — it still listed the four bugs that release fixed — and has been rewritten.

### Tests

New `src/__tests__/process-env.test.ts` (20 assertions) covering precedence in both directions (including that `process.env` is left intact under `"process-wins"`, that injected values are coerced, and that the loader's own writes are not mistaken for injected ones), the `env()` fallback and its coercion, interpolation from `process.env`, the throw-on-miss with a regression pin that no value is returned at all, forward-reference failure, and `loadEnv()` on a directory with no `.env`. The `parseValue` test that asserted the old `"prefix:undefined:suffix"` output now asserts the throw.

```
76 passed | 0 skipped
```

</details>


<details class="changelog-version">
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
