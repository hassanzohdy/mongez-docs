---
title: "Configuration"
name: mongez-pkgist-configuration
description: |
  pkgist config file shape: `pkgist.config.ts` (or `builder.ts`) with `defineConfig({ settings, standalone, families })`. Auto-discovered from cwd; runtime-loaded via dynamic import so it can use ESM `import` syntax freely. Settings block covers concurrency, buildDir, sourcesDir.
  TRIGGER when: user is creating or editing `pkgist.config.ts` or `builder.ts`; user asks "how do I set up pkgist", "where do I configure pkgist", "what goes in the config"; user imports or asks about `defineConfig` from `@mongez/pkgist`; user asks about `settings.concurrency`, `settings.buildDir`, `settings.sourcesDir`; user asks how `standalone[]` differs from `families[]` at the config level.
  SKIP: per-package field details (use `package-options` skill); CLI invocation (use `cli` skill); semantic versioning rules (use `versioning` skill); git/publish behavior (use `git-workflow` skill).
sidebar:
  order: 50
---

pkgist auto-discovers a config file in the current working directory. Two filenames are recognised:

- `pkgist.config.ts` (preferred)
- `builder.ts` (legacy alias, still supported)

The config is loaded at runtime via dynamic `import()` — it can use ESM `import` syntax freely (no transpilation needed).

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
| `sourcesDir` | `string` | — | Optional. Where source snapshots are archived per build (full copy minus `.git`, `node_modules`, `dist`). Omit if you don't want snapshots. |

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

If your `pkgist.config.ts` / `builder.ts` carries operational secrets (commit conventions, internal version strategies, package layouts that don't belong in the published tool's repo), add it to `.gitignore` and ship a `pkgist.config.example.ts` template instead. Each consumer writes their own local copy.
