---
title: "Loader"
name: mongez-dotenv-loader
description: |
  API reference and usage patterns for `loadEnv`, `loadEnvFile`, and `resetEnv` — the file-loading entry points of `@mongez/dotenv`.
  TRIGGER when: code imports `loadEnv`, `loadEnvFile`, `resetEnv`, or `EnvLoaderOptions` from `@mongez/dotenv`; user asks "how do I load .env files", "how do I pick env file by NODE_ENV", or "how does .env.shared layering work"; typical import pattern like `import { loadEnv, loadEnvFile, resetEnv, type EnvLoaderOptions } from "@mongez/dotenv"`.
  SKIP: parsing-only questions about `parseLine`/`parseValue` or the `env()` reader — use `mongez-dotenv-parser`; higher-level config groups, dot-notation lookups, or schema/defaults — that's `@mongez/config`; this skill is the `.env` file loader, not the application config layer; browser/cookie/localStorage env shims.
sidebar:
  order: 50
---

`loadEnv` and `loadEnvFile` are the two file-loading entry points. `resetEnv` undoes them.

## Signatures

```ts
function loadEnv(envPath?: string, options?: EnvLoaderOptions): void
function loadEnvFile(envPath: string, override: boolean): void
function resetEnv(): void

type EnvLoaderOptions = {
  override?: boolean;       // default true — also write into process.env
  dir?: string;             // default cwd() — search root
  loadSharedEnv?: boolean;  // default true — load .env.shared first
};
```

## File resolution (when `envPath` is omitted)

1. If `loadSharedEnv` is `true` and `${dir}/.env.shared` exists, load it first.
2. Try `${dir}/.env.${process.env.NODE_ENV}` (e.g. `.env.development`).
3. If that file does not exist, fall back to `${dir}/.env`.

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
```

Loads exactly one file. Throws if the path does not exist:

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
// 5. Multiple files with explicit ordering.
import { loadEnvFile } from "@mongez/dotenv";
loadEnvFile("/etc/myapp/base.env", true);
loadEnvFile("/etc/myapp/local.env", true);  // overrides keys from base
```
