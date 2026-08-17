---
title: "Loader"
name: mongez-dotenv-loader
description: |
  API reference and usage patterns for `loadEnv`, `loadEnvFile`, and `resetEnv` — the file-loading entry points of `@mongez/dotenv`.
sidebar:
  order: 50
---

`loadEnv` and `loadEnvFile` are the two file-loading entry points. `resetEnv` undoes them.

## Signatures

```ts
function loadEnv(envPath?: string, options?: EnvLoaderOptions): void
function loadEnvFile(
  envPath: string,
  override: boolean,
  precedence?: EnvPrecedence,   // default "file-wins"
): void
function resetEnv(): void

type EnvPrecedence = "file-wins" | "process-wins";

type EnvLoaderOptions = {
  override?: boolean;           // default true — also write into process.env
  dir?: string;                 // default cwd() — search root
  loadSharedEnv?: boolean;      // default true — load .env.shared first
  precedence?: EnvPrecedence;   // default "file-wins" — who wins vs process.env
};
```

## File resolution (when `envPath` is omitted)

1. If `loadSharedEnv` is `true` and `${dir}/.env.shared` exists, load it first.
2. Try `${dir}/.env.${process.env.NODE_ENV}` (e.g. `.env.development`).
3. If that file does not exist, fall back to `${dir}/.env`.
4. If that does not exist either, do nothing — no throw. A project with no `.env` at all is a supported state.

```ts
process.env.NODE_ENV = "development";
loadEnv();
// → .env.shared    (if present)
// → .env.development
```

```ts
process.env.NODE_ENV = "test";  // no .env.test on disk
loadEnv();
// → .env.shared    (if present)
// → .env
```

```ts
loadEnv("/etc/secrets.env");    // explicit path skips the resolver,
                                 // but .env.shared is still loaded first
                                 // unless loadSharedEnv: false
```

An explicitly-passed `envPath` that does not exist still throws — the caller named it, so a typo must be loud. Only the paths `loadEnv` derives for itself (steps 2–3 above) are optional.

`dir` and `envPath` are also rejected outright when they contain a `..` segment, so a value derived from config or a CLI flag can't walk the loader outside its intended directory and pull an unrelated file into `process.env`. Absolute paths are still accepted — passing one is the caller explicitly naming that file.

## Precedence semantics — file vs. the real environment

| Setting | A key in BOTH the file and `process.env` |
|---|---|
| `precedence: "file-wins"` (default) | The file value replaces the injected one, in the store and (when `override`) in `process.env`. |
| `precedence: "process-wins"` | The injected value is authoritative. The file does not replace it in the store and does not write over it. |

```ts
// Docker / Kubernetes / CI: the platform owns the environment.
loadEnv(undefined, { precedence: "process-wins" });
```

- `"file-wins"` stays the default for the whole v1.x line so a minor bump never changes what a running deployment reads. **v2.0 flips the default to `"process-wins"`.**
- Keys the loader itself wrote earlier in the same run (`.env.shared`, or a previous `loadEnvFile`) are tracked in an internal `Set` and are NOT mistaken for platform-injected values — file layering keeps working under `"process-wins"`.
- Values taken from `process.env` are coerced to primitives the same way file values are (`"8080"` → `8080`), but WITHOUT quote stripping or `${VAR}` interpolation.

## Override semantics

| Setting | Internal store | `process.env` |
|---|---|---|
| `override: true` (default) | Typed value (number / boolean / null / string) | Written, then coerced to string by Node |
| `override: false` | Typed value | Untouched |

```ts
loadEnv(undefined, { override: false });

process.env.APP_PORT;  // undefined (not written)
env("APP_PORT");       // 3000      (in store anyway)
```

## Layering

```bash
# .env.shared
APP_NAME="My App"
APP_URL="https://example.com"

# .env.production
DB_HOST=prod-db.example.com
DEBUG=false
```

```ts
process.env.NODE_ENV = "production";
loadEnv();

env("APP_NAME");  // "My App"                  — from .env.shared
env("DB_HOST");   // "prod-db.example.com"     — from .env.production
env("DEBUG");     // false
```

If a key appears in both files, the environment-specific file wins (it loads second, and with `override: true` writes through).

## `loadEnvFile` — the low-level form

```ts
loadEnvFile("/abs/path/to/.env", /* override */ true);
loadEnvFile("/abs/path/to/.env", true, "process-wins");
```

Loads exactly one file. Always throws if the path does not exist — it is the primitive and never guesses:

```
Error: .env file not found at /abs/path/to/.env
```

Use this when you need to load a file outside the standard resolution chain (e.g. a `secrets.env` somewhere on disk, deferred loading, multiple env files at different paths).

## `resetEnv`

```ts
resetEnv();
```

Does:

1. Clears every key from the internal store.
2. Deletes any `process.env` keys that `loadEnvFile` wrote since module load (tracked internally in a `Set`).
3. Re-assigns every key in the import-time `process.env` snapshot back to `process.env`.

The net effect is a true "back to t0" for anything the loader added. Keys that callers set directly on `process.env` (without going through `loadEnv` / `loadEnvFile`) are not tracked and survive the reset — the caller owns their own additions.

## Common loading patterns

```ts
// 1. Boot at startup, defaults.
import { loadEnv } from "@mongez/dotenv";
loadEnv();
```

```ts
// 2. Read-only — populate store but don't touch process.env.
loadEnv(undefined, { override: false });
```

```ts
// 3. Custom directory (monorepo with env files in a sibling).
loadEnv(undefined, { dir: path.resolve(__dirname, "../config") });
```

```ts
// 4. Skip the shared layer (rare).
loadEnv(undefined, { loadSharedEnv: false });
```

```ts
// 4b. Containerised deploy — injected values outrank the baked-in file.
loadEnv(undefined, { precedence: "process-wins" });
```

```ts
// 5. Multiple files with explicit ordering.
import { loadEnvFile } from "@mongez/dotenv";
loadEnvFile("/etc/myapp/base.env", true);
loadEnvFile("/etc/myapp/local.env", true);  // overrides keys from base
```
