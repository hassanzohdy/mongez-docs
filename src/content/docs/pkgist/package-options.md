---
title: "Package Options"

name: mongez-pkgist-package-options
description: |
  Every per-package field accepted in `standalone[]` and `families[].packages[]`: `name`, `root`, `type`, `formats`, `mainType`, `entries`, `srcDir`, `dts`, `sourcemap`, `minify`, `preserveModules`, `clone`, `publish`, `access`, `commit`, `branch`. Defaults, semantics, and which fields are standalone-only or family-level-only.
sidebar:
  order: 50
---

# Package options

Every entry in `standalone[]` and `families[].packages[]` accepts these fields. Family entries use the same fields **except** `version` (family-level only).

## Required

| Field | Type | Description |
|---|---|---|
| `name` | `string` | npm package name (e.g. `"@my-scope/utils"`) |
| `root` | `string` | Path to the package root, relative to the config file location |

## Build shape

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `"typescript" \| "react"` | `"typescript"` | React packages get JSX/TSX transform enabled |
| `formats` | `("esm" \| "cjs")[]` | `["esm", "cjs"]` | Output formats to produce |
| `mainType` | `"cjs" \| "esm"` | `"cjs"` | Primary format — determines `main` field in the build's package.json |
| `entries` | `string \| string[]` | `["index.ts"]` | Entry files inside `srcDir`. Use an array for packages with multiple bins (e.g. CLI + library) |
| `srcDir` | `string` | `"src"` | Source directory name relative to the package root |
| `dts` | `boolean` | `true` | Generate `.d.ts` / `.d.mts` / `.d.cts` declarations |
| `sourcemap` | `boolean` | `true` | Emit sourcemaps alongside JS output |
| `minify` | `boolean` | `false` | Minify output (rarely useful for libraries — consumers do this) |
| `preserveModules` | `boolean` | `true` | Keep one output file per source module (preserves stack traces). See below. |

### `preserveModules` — why it matters

**With `preserveModules: true` (default)**: each `src/path/to/file.ts` becomes its own `esm/path/to/file.mjs` and `cjs/path/to/file.cjs`. Stack traces in production show real file names (`array/chunk.mjs:4`) instead of opaque bundle offsets (`index.js:1027`). Required for any non-trivial library.

**With `preserveModules: false`**: every source file gets bundled into a single `esm/index.js` and `cjs/index.js`. Acceptable only for tiny single-file packages where the structure is trivially flat.

## Cloning extras into the build

| Field | Type | Default | Description |
|---|---|---|---|
| `clone` | `(string \| [string, string])[]` | `[]` | Files/dirs to copy from the package root into the build dir |

```ts
clone: [
  "README.md",
  "LICENSE",
  "skills",                              // copy entire skills/ folder
  "llms.txt",
  "llms-full.txt",
  ["dist-extras/icon.svg", "icon.svg"],  // tuple form: [src, dest] with rename
]
```

**Cloning is the only way to ship non-source files in your npm package.** pkgist's build dir is otherwise empty except for the compiled output. If you skip cloning README.md, the published package has no README on npmjs.com.

## Publish

| Field | Type | Default | Description |
|---|---|---|---|
| `publish` | `boolean` | `true` | Run `npm publish` after build. Set to `false` for build-only packages |
| `access` | `"public" \| "restricted"` | `"public"` | `npm publish --access <value>`. Restricted requires a paid npm org |

## Git

| Field | Type | Default | Description |
|---|---|---|---|
| `commit` | `string \| true \| false` | omitted | Drives git commit / tag / push. See `git-workflow` skill for the full table |
| `branch` | `string` | current branch | Branch to push to |

## Standalone-only

| Field | Type | Default | Description |
|---|---|---|---|
| `version` | `"auto" \| "patch" \| "minor" \| "major" \| string` | `"auto"` | Version bump strategy. See `versioning` skill |

`version` does NOT belong on family-member entries — the family declares one shared version that applies to all members.

## Common shapes

### Standard TypeScript library

```ts
{
  name: "@scope/util",
  root: "../util",
  commit: true,
  clone: ["README.md", "LICENSE"],
}
```

### React component library

```ts
{
  name: "@scope/ui",
  root: "../ui",
  type: "react",
  commit: true,
  clone: ["README.md", "LICENSE"],
}
```

### ESM-only Vite/build-tool package

```ts
{
  name: "@scope/vite-plugin",
  root: "../vite-plugin",
  mainType: "esm",
  formats: ["esm"],
  commit: true,
}
```

### Package with both library and CLI entries

```ts
{
  name: "@scope/agent-kit",
  root: "../agent-kit",
  entries: ["index.ts", "cli/index.ts"],
  commit: true,
  clone: ["README.md", "LICENSE", "bin"],
}
```

The `bin` field in the source package.json points to one of the entries (e.g. `dist/cli.js`). pkgist preserves the bin field in the built package.json automatically.

### Build-only (no publish)

```ts
{
  name: "@scope/internal",
  root: "../internal",
  publish: false,
  commit: true,
}
```

Useful for packages that build for local consumption but don't go to npm.
