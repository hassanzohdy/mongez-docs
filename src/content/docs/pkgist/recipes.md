---
title: "Recipes"

name: mongez-pkgist-recipes
description: |
  Common pkgist patterns ready to copy: single TypeScript library, React component package, Vite/ESM-only plugin, package with library + CLI entries, build-only (no publish) package, family of synchronized packages, hands-off `commit: true` config, monorepo with mixed packages, dry-run-first release flow, hotfix one package, build everything without publishing.
sidebar:
  order: 99
---

# Recipes

Each recipe is a complete, copy-paste-able `pkgist.config.ts` shape (or fragment) for a common situation.

## Single TypeScript library, hands-off releases

The smallest practical config. Auto-bumps patch, auto-generates `Released X.Y.Z` commits, ships README + LICENSE.

```ts
import { defineConfig } from "@mongez/pkgist";

export default defineConfig({
  settings: { buildDir: "../builds" },
  standalone: [
    {
      name: "@scope/utils",
      root: "../utils",
      commit: true,
      clone: ["README.md", "LICENSE"],
    },
  ],
});
```

Release with `pkgist build:all`. Done.

## React component library

Same shape, just `type: "react"` to enable JSX/TSX transform.

```ts
{
  name: "@scope/ui",
  root: "../ui",
  type: "react",
  commit: true,
  clone: ["README.md", "LICENSE"],
}
```

## ESM-only Vite/build-tool plugin

Vite plugins run in Vite's ESM context — no need to ship CJS.

```ts
{
  name: "@scope/vite-plugin",
  root: "../vite-plugin",
  mainType: "esm",
  formats: ["esm"],
  commit: true,
  clone: ["README.md", "LICENSE"],
}
```

The generated `package.json` includes `"type": "module"` and omits the `require` condition in the exports map.

## Package with both library + CLI entries

For packages that expose both a programmatic API and a CLI binary (like pkgist itself):

```ts
{
  name: "@scope/agent-kit",
  root: "../agent-kit",
  entries: ["index.ts", "cli/index.ts"],
  commit: true,
  clone: ["README.md", "LICENSE", "bin"],
}
```

The source package.json's `bin` field points to one of the compiled outputs (e.g. `dist/cli.js`). pkgist preserves it in the build package.json after normalizing leading `./`.

## Build-only (don't publish)

For internal packages that you build but don't ship to npm:

```ts
{
  name: "@scope/internal-tools",
  root: "../internal-tools",
  publish: false,
  commit: true,
}
```

Build runs, git runs, but npm publish is skipped.

## Family of synchronized packages

When several packages must always release together (e.g. core + framework adapters):

```ts
families: [
  {
    name: "state",
    version: "patch",
    commit: true,                       // every member commits "Released <shared-version>"
    packages: [
      { name: "@scope/state-core",       root: "../state-core" },
      { name: "@scope/react-state",      root: "../react-state",      type: "react" },
      { name: "@scope/svelte-state",     root: "../svelte-state" },
    ],
  },
],
```

`pkgist build:family state` rebuilds all three, computing the next version from the highest current, then landing all members on it.

## Mixed monorepo: shared constants

When you have many packages with similar configs, share constants:

```ts
import { defineConfig } from "@mongez/pkgist";

const STANDARD_CLONE = ["README.md", "LICENSE", "skills", "llms.txt", "llms-full.txt"];

export default defineConfig({
  settings: { buildDir: "../builds", concurrency: 8 },
  standalone: [
    { name: "@scope/utils",    root: "../utils",    commit: true, clone: STANDARD_CLONE },
    { name: "@scope/strings",  root: "../strings",  commit: true, clone: STANDARD_CLONE },
    { name: "@scope/arrays",   root: "../arrays",   commit: true, clone: STANDARD_CLONE },
    { name: "@scope/ui",       root: "../ui",       commit: true, clone: STANDARD_CLONE, type: "react" },
    { name: "@scope/vite-plug",root: "../vite-plug",commit: true, clone: STANDARD_CLONE, mainType: "esm", formats: ["esm"] },
  ],
  families: [
    {
      name: "state",
      commit: true,
      packages: [
        { name: "@scope/state-core",  root: "../state-core",  clone: STANDARD_CLONE },
        { name: "@scope/react-state", root: "../react-state", clone: STANDARD_CLONE, type: "react" },
      ],
    },
  ],
});
```

Adding a new package is one line. Updating the clone list across the fleet is one constant edit.

## Per-release custom commit messages

For releases where you want the commit message to describe what changed (not just `Released X.Y.Z`):

```ts
const RELEASE_COMMIT = "fix: prevent overflow on large arrays";

export default defineConfig({
  // ...
  standalone: [
    { name: "@scope/utils", root: "../utils", commit: RELEASE_COMMIT },
    { name: "@scope/cache", root: "../cache", commit: RELEASE_COMMIT },
  ],
});
```

Update `RELEASE_COMMIT` before each release run. Commits to all packages get the same message. Combine with targeted `pkgist build` to release only the changed packages.

## Dry-run-first release flow

Standard discipline — never run a real build without dry-running first:

```sh
pkgist validate                  # verify config parses + paths exist
pkgist build:all --dry-run       # preview every step
# Review the output for: correct versions, intended commit message, sane clone lists, expected git operations
pkgist build:all                 # real run
```

For targeted releases substitute `build:family <name>` or `build @scope/pkg` as needed.

## Hotfix one package

When you need to fix and release exactly one package without touching the rest:

```sh
# Edit the source
pkgist build @scope/the-pkg --dry-run
pkgist build @scope/the-pkg
```

The other packages in your config are untouched.

## Build everything without publishing

For verifying the entire fleet compiles correctly without shipping anything:

```sh
pkgist build:all --no-publish --no-git
```

Useful before a major release to catch breakages before committing to the publish.

## CI-friendly: build + publish, no git

When CI handles git separately (tagging via release pipeline), skip pkgist's git step but keep the publish:

```sh
pkgist build:all --no-git
```

Or per-package: set `commit: false` and let pkgist publish without committing.
