---
title: "Dotenv"
name: mongez-dotenv-overview
description: |
  High-level mental model of `@mongez/dotenv` — what it does, its module-scoped state, scope boundaries, and known quirks.
  TRIGGER when: code imports any of `loadEnv`, `loadEnvFile`, `parseLine`, `parseValue`, `env`, `resetEnv`, or `EnvLoaderOptions` from `@mongez/dotenv` for the first time; user asks "what is @mongez/dotenv", "how does the envData store work", or "should I use @mongez/dotenv vs dotenv"; typical import pattern like `import { loadEnv, env } from "@mongez/dotenv"`.
  SKIP: deep-dive questions on specific APIs — use `mongez-dotenv-loader` (file loading) or `mongez-dotenv-parser` (parsing/reading); end-to-end recipes — use `mongez-dotenv-recipes`; the app-config layer (groups, dot-notation, schema) is `@mongez/config`, not this package which only parses `.env` files.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/dotenv` is a small `.env` loader for Node.js. It parses `KEY=VALUE` lines, coerces values to typed primitives (number, boolean, `null`) when they look like one, supports `${VAR}` interpolation between keys, picks the right file based on `NODE_ENV`, and layers a `.env.shared` file of defaults underneath.

The package is intentionally narrow:

- One source file (`src/index.ts`).
- No runtime dependencies, no peer dependencies.
- Node-only — uses `fs` and `process`.

## Install

```sh
yarn add @mongez/dotenv
# or
npm i @mongez/dotenv
```

## Import pattern

```ts
import {
  loadEnv,
  loadEnvFile,
  parseLine,
  parseValue,
  env,
  resetEnv,
  type EnvLoaderOptions,
} from "@mongez/dotenv";
```

## Mental model

| Concept | Where it lives | What it is |
|---|---|---|
| Internal store | Module-level `envData` object | The typed view of every loaded key. Read via `env()` / `env.all()`. |
| `process.env` mirror | Real Node `process.env` | Optional write-through, controlled by the `override` option. Always stores strings. |
| Initial snapshot | Module-level `initialProcessEnvData` | Captured at first import. `resetEnv` restores keys from this snapshot. |

The loader is **stateful and module-scoped**. There is one store per Node process. Calling `loadEnv` twice merges the second file's keys into the first store rather than starting over.

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| Validation / schema | `zod`, `valibot`, your code | This package does not type-check loaded values. |
| Higher-level config (groups, dot-notation, defaults) | `@mongez/config` | This package is one slice — the file-loading slice. |
| Caching | `@mongez/cache` | Unrelated concern. |
| Browser/cookie/localStorage | Other packages | This is a Node filesystem reader. |

## Quirks worth knowing up front

1. **`process.env` always stringifies.** Even though the package writes `process.env.PORT = 3000`, Node's `process.env` setter coerces to `"3000"`. Use `env()` if you want the typed value.
2. **`${VAR}` is parse-time only.** Substitutions happen the moment the value is parsed. Later updates to the referenced key do not re-trigger substitution in earlier lines.
