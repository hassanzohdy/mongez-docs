---
title: "Configuration"

name: mongez-pkgist-configuration
description: |
  pkgist config file shape: a single `pkgist.config.ts` (or `.js`) with `defineConfig({ settings, standalone, families })`. Scaffold it with `pkgist init`. Auto-discovered from cwd; runtime-loaded via dynamic import so it can use ESM `import` syntax freely. Settings block covers concurrency, buildDir, sourcesDir.
sidebar:
  order: 17
---

# Configuration

pkgist auto-discovers its config in the current working directory, trying **`pkgist.config.ts`** then **`pkgist.config.js`** — first match wins. One config name, no legacy aliases. Run `pkgist init` to scaffold one, or pass `--config <path>` for a custom location.

TypeScript configs are loaded via `tsx` so you can use ESM `import` syntax freely without a separate transpile step — `tsx` is registered automatically when a `.ts` config is detected (and silently skipped if not installed, in which case use a `.js` config).

## Scaffolding with `pkgist init`

```sh
pkgist init
```

Writes a starter `pkgist.config.ts` (with `buildDir: "./builds"` and `sourcesDir: "./sources"`) into the current directory. It never clobbers an existing config — pass `--force` to overwrite. From there, edit the `standalone[]` / `families[]` entries to point at your packages and run `pkgist validate`.

## The `defineConfig` shape

```ts
import { defineConfig } from "@mongez/pkgist";

export default defineConfig({
  settings: { /* ... */ },
  standalone: [ /* ... */ ],
  families: [ /* ... */ ],
});
```

`defineConfig` is a type-safety helper — pass it your config object and TypeScript infers everything correctly. Without it, you can still `export default { ... }` directly, you just lose autocomplete.

## `settings`

Top-level options that apply to every build run.

| Field | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `4` | Max parallel package builds. Override per-run with `--concurrency <n>`. |
| `buildDir` | `string` | **required** | Where compiled packages are written, relative to the config file. |
| `sourcesDir` | `string` | — | Optional. Where source snapshots are archived per build (full copy minus `.git`, `node_modules`, `dist`, `.turbo`, `.cache`). Omit if you don't want snapshots. |

```ts
settings: {
  concurrency: 8,
  buildDir: "../builds",
  sourcesDir: "../sources",
}
```

## `standalone[]`

Array of packages that each have their own version lifecycle. Each entry is one independent npm package.

```ts
standalone: [
  {
    name: "@my-scope/utils",
    root: "../utils",
    version: "patch",
    commit: true,
    clone: ["README.md", "LICENSE", "skills", "llms.txt"],
  },
]
```

See the `package-options` skill for every available field and the `versioning` skill for `version` strategies.

## `families[]`

Array of package groups that share a synchronized version. Useful when several packages must always release together because their APIs are linked (e.g. a framework-agnostic core + several framework adapters).

```ts
families: [
  {
    name: "state",                       // identifier for `build:family state`
    version: "patch",                    // strategy applied to the whole group
    commit: true,                        // single message (or true for auto) for all members
    packages: [
      { name: "@my-scope/core",       root: "../core" },
      { name: "@my-scope/react-core", root: "../react-core", type: "react" },
    ],
  },
]
```

The family picks the **highest current version** across all members, then bumps it. So if `core=1.0.5` and `react-core=2.1.0`, a `"patch"` strategy lands all members on `2.1.1`.

Members in a family use the same fields as standalone packages **except** `version` (which is family-level only).

## File discovery + override

By default pkgist looks in the current working directory. Override with `--config`:

```sh
pkgist build:all --config ./packaging/pkgist.config.ts
```

Path is relative to cwd.

## Reusing constants across packages

A common pattern — share commit messages, version strategies, or clone arrays via local constants:

```ts
import { defineConfig } from "@mongez/pkgist";

const RELEASE_COMMIT = "chore: release";
const STANDARD_CLONE = ["README.md", "LICENSE", "skills", "llms.txt", "llms-full.txt"];

export default defineConfig({
  settings: { buildDir: "../builds" },
  standalone: [
    { name: "@x/a", root: "../a", commit: RELEASE_COMMIT, clone: STANDARD_CLONE },
    { name: "@x/b", root: "../b", commit: RELEASE_COMMIT, clone: STANDARD_CLONE },
  ],
});
```

Update one constant → applies everywhere. The config is just TypeScript.

## Gitignoring local configs

If your `pkgist.config.ts` carries operational secrets (commit conventions, internal version strategies, package layouts that don't belong in the published tool's repo), add it to `.gitignore` and ship a `pkgist.config.example.ts` template instead. Each consumer writes their own local copy (or runs `pkgist init`).
