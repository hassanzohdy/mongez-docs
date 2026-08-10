---
title: "Recipes"
name: mongez-dotenv-recipes
description: |
  Idiomatic patterns and worked examples for common `@mongez/dotenv` use cases — bootstrapping, layered env files, typed config objects, read-only mode, `process-wins` precedence for containerised deploys, reading platform-injected variables, optional `.env`, `null` handling, and full reset.
sidebar:
  order: 99
---

Idiomatic compositions of `@mongez/dotenv` features.

## Boot at process start

```ts
// src/bootstrap.ts — imported first by your entry point
import { loadEnv } from "@mongez/dotenv";

loadEnv();
```

```ts
// src/index.ts
import "./bootstrap";        // make sure this runs before anything else
import { env } from "@mongez/dotenv";

const app = createApp();
app.listen(env("APP_PORT", 3000));
```

## Per-environment config with shared defaults

```bash
# config/.env.shared
APP_NAME="My App"
APP_DESCRIPTION="A web app"

# config/.env.development
DB_URL="mongodb://localhost/dev"
DEBUG=true
LOG_LEVEL=debug

# config/.env.production
DB_URL="mongodb+srv://prod-host/app?retryWrites=true&w=majority"
DEBUG=false
LOG_LEVEL=info
```

```ts
import path from "node:path";
import { loadEnv, env } from "@mongez/dotenv";

loadEnv(undefined, {
  dir: path.resolve(__dirname, "../config"),
});

env("APP_NAME");   // "My App"           (from .env.shared, both envs)
env("DEBUG");      // true | false       (per-environment)
env("DB_URL");     // mongo URL          (per-environment)
```

## Reading typed values straight into a config object

```ts
import { env } from "@mongez/dotenv";

export const config = {
  app: {
    name: env("APP_NAME", "App"),
    port: env("APP_PORT", 3000) as number,
    debug: env("DEBUG", false) as boolean,
  },
  db: {
    url: env("DB_URL") as string,
  },
};
```

The `as` casts are because `env(...)` returns `any`. Layer `zod` / `valibot` on top if you want runtime validation:

```ts
import { z } from "zod";
import { env } from "@mongez/dotenv";

const schema = z.object({
  APP_PORT: z.number().int().positive(),
  DEBUG: z.boolean(),
  DB_URL: z.string().url(),
});

export const config = schema.parse({
  APP_PORT: env("APP_PORT"),
  DEBUG: env("DEBUG"),
  DB_URL: env("DB_URL"),
});
```

## Loading multiple files in a specific order

```ts
import { loadEnvFile } from "@mongez/dotenv";

loadEnvFile("/etc/myapp/base.env",  true);   // global base
loadEnvFile("/etc/myapp/local.env", true);   // host-specific overrides
loadEnvFile("./.env",               true);   // per-checkout overrides last
```

Each subsequent file with `override: true` overwrites keys from the previous one.

## Read-only mode (don't touch `process.env`)

```ts
import { loadEnv, env } from "@mongez/dotenv";

loadEnv(undefined, { override: false });

process.env.APP_PORT;   // unchanged
env("APP_PORT");        // typed value from the file
```

`override` controls only the write-back. It does **not** control precedence: with the default `precedence: "file-wins"`, the file value still replaces the injected one inside the store, so `env("APP_PORT")` returns the file's value even when the orchestrator set a different one. Use `precedence` for that.

## Let the platform's injected values win (Docker / Kubernetes / CI)

```ts
import { loadEnv, env } from "@mongez/dotenv";

loadEnv(undefined, { precedence: "process-wins" });

// DATABASE_URL injected by the platform → the .env line is ignored,
//                                         and process.env is left intact.
// APP_NAME only in .env                 → the file value is used.
env("DATABASE_URL");
env("APP_NAME");
```

Reach for this in any containerised deploy. The default, `"file-wins"`, means a `.env` file baked into the image silently overwrites what the platform injected — the exact inversion of what `dotenv`, `dotenv-flow`, Vite and Next do. It stays the default for all of v1.x so a minor bump never changes what a running deployment reads; **v2.0 flips it**.

Combine with `override: false` when `process.env` should also be left untouched for the keys the file does own:

```ts
loadEnv(undefined, { precedence: "process-wins", override: false });
```

## Reading a variable that only the platform sets

```ts
import { env } from "@mongez/dotenv";

// No .env file declares NODE_ENV or PORT — the platform injected them.
env("NODE_ENV", "development");   // "production" (from process.env)
env("PORT", 3000);                // 8080         (coerced to a number)
```

`env()` reads **store → `process.env` → default**, so this works even before `loadEnv()` has been called. Values taken from `process.env` get the same narrow coercion a file value gets, without quote stripping or `${VAR}` interpolation.

## Optional `.env` (no file on disk)

```ts
import { loadEnv } from "@mongez/dotenv";

loadEnv();   // directory has no .env, .env.shared, or .env.<NODE_ENV> → no-op
```

`loadEnv()` skips the paths it derives when nothing is on disk, so a container that gets everything from injected variables needs no guard. A path you pass explicitly still throws when missing:

```ts
loadEnv("/etc/myapp/secrets.env");  // throws if absent — you named it
```

## Distinguishing a loaded `null` from a missing key

`env(key)` preserves a deliberately-loaded `null` (it checks `key in envData` rather than `??`), so the loaded value passes through directly:

```ts
import { env } from "@mongez/dotenv";

// .env contains: EST_TIME=null
env("EST_TIME");                 // null
env("EST_TIME", "fallback");     // null  (loaded null wins over default)
env("MISSING");                  // undefined
env("MISSING", "fallback");      // "fallback"
```

## Reset in tests

`resetEnv` clears the internal store, deletes any `process.env` keys that the loader wrote since module load, and re-applies the import-time snapshot — so a single call is enough to undo a `loadEnv` between tests:

```ts
import { afterEach } from "vitest";
import { resetEnv } from "@mongez/dotenv";

afterEach(() => {
  resetEnv();
});
```

Keys that the test sets directly on `process.env` (without going through `loadEnv` / `loadEnvFile`) are not tracked by the loader and survive the reset — manage those yourself if needed.

## Quoted values with `#`

The parser is quote-aware: when a value opens with `"`, `'`, or `` ` ``, the matching closing quote is the last occurrence of that same character, and anything after it (whitespace + a `# comment`) is discarded.

```bash
# Fully-quoted, contains #, no trailing comment
DB_PASS="AMFSDF#QWEWQE"
#   → "AMFSDF#QWEWQE"

# Fully-quoted, contains #, with a trailing comment
HTTP_URL2="https://${HOST}#fragment" # some comment
#   → "https://example.com#fragment"

# Unquoted, no # — trailing comment is fine
APP_NAME=My App
```
