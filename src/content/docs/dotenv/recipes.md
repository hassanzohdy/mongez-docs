---
title: "Recipes"
name: mongez-dotenv-recipes
description: |
  Idiomatic patterns and worked examples for common `@mongez/dotenv` use cases — bootstrapping, layered env files, typed config objects, read-only mode, `null` handling, and full reset.
  TRIGGER when: code composes `loadEnv`, `loadEnvFile`, `env`, or `resetEnv` from `@mongez/dotenv` into a startup/bootstrap file or config object; user asks "how do I bootstrap env at startup", "how do I build a typed config from env", "how do I do a full process.env reset in tests", or "how do I work around the null collapse"; typical import pattern like `import { loadEnv, env } from "@mongez/dotenv"`.
  SKIP: pure API reference for a single function — use `mongez-dotenv-loader` (loading) or `mongez-dotenv-parser` (parsing/reading); first-touch mental-model questions — use `mongez-dotenv-overview`; the app-config layer (groups, dot-notation, schema) is `@mongez/config`, not this `.env`-file package.
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

Useful when a parent process / orchestrator already set `process.env` and you want the file as a fallback rather than a replacement.

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
