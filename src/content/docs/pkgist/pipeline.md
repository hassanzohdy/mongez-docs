---
title: "Pipeline"

name: mongez-pkgist-pipeline
description: |
  Per-package build pipeline: 1) load source package.json, 2) resolve new version, 3) create build dir, 4) snapshot source to sourcesDir (excludes .git/node_modules/dist), 5) compile via tsdown to esm/+cjs/, 6) clone extra files, 7) write clean build package.json, 8) update source package.json version in-place, 9) git add/commit/push/tag, 10) npm publish from build dir. Output structure with preserveModules true/false documented.
sidebar:
  order: 50
---

# Build pipeline

What pkgist does for each package, in order. Steps 4 and 9 are conditional; the rest run for every successful build.

## The 10 steps

```
1. Load source package.json → read current version
2. Resolve new version (auto-bump or explicit)
3. Create build output directory (buildDir/<name>/<new-version>/)
4. Snapshot source to sourcesDir/<name>/ — full copy excluding .git, node_modules, dist, .turbo, .cache
   (only if settings.sourcesDir is set)
5. Compile with tsdown → esm/ and cjs/ subdirectories
6. Clone extra files/directories listed in `clone`
7. Write clean package.json for the build (no devDeps, no scripts)
8. Update source package.json version in-place
9. Git: add -A → commit → push → tag v<version> → push tags
   (only if commit resolves to a non-empty string)
10. npm publish --access <public|restricted> from build directory
    (only if publish !== false)
```

Build, clone, write, git, and publish each happen in parallel across packages up to `concurrency`. Within one package, the steps are strictly sequential.

## Build output structure

### With `preserveModules: true` (default)

Each source file becomes its own output file, mirroring the source tree:

```
builds/
└── utils/
    └── 2.1.1/
        ├── package.json            ← clean: no devDeps, no scripts
        ├── README.md               ← cloned
        ├── LICENSE                 ← cloned
        ├── skills/                 ← cloned (directory)
        ├── llms.txt                ← cloned
        ├── llms-full.txt           ← cloned
        ├── esm/
        │   ├── index.mjs
        │   ├── index.mjs.map
        │   ├── index.d.mts
        │   ├── array/
        │   │   ├── chunk.mjs
        │   │   ├── chunk.mjs.map
        │   │   └── chunk.d.mts
        │   └── string/
        │       ├── trim.mjs
        │       └── trim.d.mts
        └── cjs/
            ├── index.cjs
            ├── index.cjs.map
            ├── index.d.cts
            └── array/
                ├── chunk.cjs
                └── chunk.d.cts
```

The generated `package.json` sets:

```json
{
  "main":   "./cjs/index.cjs",
  "module": "./esm/index.mjs",
  "types":  "./esm/index.d.mts",
  "exports": {
    ".": {
      "import":  { "types": "./esm/index.d.mts", "default": "./esm/index.mjs" },
      "require": { "types": "./esm/index.d.mts", "default": "./cjs/index.cjs" }
    }
  }
}
```

This is the standard dual-publish shape. Bundlers, Node ESM, Node CJS, and TypeScript all resolve correctly.

Note: when `preserveModules: true` (the default) and both ESM + CJS are emitted, the `require` condition's `types` deliberately points back at the `./esm/*.d.mts` declarations rather than CJS-side `.d.cts` files. CJS dts emit is skipped in this mode to dodge a rolldown bug; TypeScript still resolves types correctly because the declarations are reachable through the `exports` map.

### With `preserveModules: false`

Everything bundled into a single file per format:

```
builds/
└── tiny-pkg/
    └── 1.0.0/
        ├── package.json
        ├── README.md
        ├── esm/
        │   ├── index.js
        │   ├── index.js.map
        │   └── index.d.ts
        └── cjs/
            ├── index.js
            ├── index.js.map
            └── index.d.ts
```

```json
{
  "main":   "./cjs/index.js",
  "module": "./esm/index.js",
  "types":  "./esm/index.d.ts"
}
```

Use only for trivial single-file packages. Loses stack-trace fidelity.

## ESM-only packages

When `mainType: "esm"` or `formats: ["esm"]`:

- The generated `package.json` includes `"type": "module"`
- The `require` condition is omitted from the `exports` map
- No `cjs/` directory is produced
- `main` points to the ESM file

```json
{
  "type": "module",
  "main":   "./esm/index.mjs",
  "module": "./esm/index.mjs",
  "types":  "./esm/index.d.mts",
  "exports": {
    ".": {
      "import": { "types": "./esm/index.d.mts", "default": "./esm/index.mjs" }
    }
  }
}
```

Use for tools that only need to run in modern environments (Vite plugins, Node-only CLIs targeting Node 18+).

## What ends up in the published `package.json`

pkgist generates a clean `package.json` for the build — it does NOT copy yours verbatim. Specifically:

- **Kept**: `name`, `description`, `keywords`, `author`, `license`, `repository`, `homepage`, `bugs`, `dependencies`, `peerDependencies`, `sideEffects`, `bin`, `engines`
- **Replaced / set**: `name`, `version`, `main`, `module`, `types`, `exports`, and `type` (set to `"module"` for ESM-only builds)
- **Dropped**: everything else (`devDependencies`, `scripts`, `private`, `workspaces`, `optionalDependencies`, `peerDependenciesMeta`, `files`, `publishConfig`, etc.)

This is intentional — the published package should not carry your build-time tooling or scripts.

### Intra-family dependency pinning (family builds only)

When a package is built as part of a **family**, any `dependencies` / `peerDependencies` entry that names another family member is rewritten from its source spec (typically `"*"`, the workspace-linking convention) to the **exact** shared release version in the published `package.json`. Standalone builds skip this — their deps publish verbatim. The source `package.json` keeps `"*"`; only the build copy is pinned. See the `versioning` skill for the full rule.

### `bin` normalization

The `bin` field is preserved but normalized: leading `./` is stripped (npm rejects bin values that start with `./`). So `{"my-cli": "./dist/cli.js"}` in source becomes `{"my-cli": "dist/cli.js"}` in the build.

## Source snapshots (optional)

If `settings.sourcesDir` is set, pkgist archives a full copy of the source (minus `.git`, `node_modules`, `dist`, `.turbo`, `.cache`) into `<sourcesDir>/<name>/` before every build. Useful for:

- Reconstructing what was published at any point in time
- Diffing published versions without checking out specific tags
- Recovering from accidental source edits between build and publish

Omit `sourcesDir` to skip this step entirely.

## Publish step

`npm publish --access <public|restricted>` runs from the **build directory**, not the source. The build dir has the clean `package.json` + compiled output + cloned files — that's exactly what ships.

When `publish: false` is set on a package, the publish step is skipped (build + git still run). Use for internal-only packages.

`--no-publish` on the CLI skips the publish step for every package, regardless of config.

## What's NOT in the pipeline

- **Running tests** — pkgist trusts you. Run your own test suite before invoking pkgist.
- **Linting / formatting** — same. Run as pre-commit hooks or separate CI steps.
- **Changelog generation** — pkgist doesn't write a CHANGELOG.md. Pair with conventional-changelog or release-please if you want one.
- **Dependency hoisting / workspace install** — pkgist doesn't touch `node_modules`. Run `yarn install` / `pnpm install` separately.

This keeps pkgist focused: take source, produce a clean publishable artifact, commit, tag, publish. The rest of the release lifecycle is your call.
