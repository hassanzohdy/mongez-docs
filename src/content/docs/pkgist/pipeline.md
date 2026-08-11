---
title: "Pipeline"

name: mongez-pkgist-pipeline
description: |
  Per-package build pipeline: 1) load source package.json, 2) resolve new version, 3) create build dir, 4) snapshot source to sourcesDir (excludes .git/node_modules/dist), 5) compile via tsdown to esm/+cjs/, 6) clone extra files, 7) write clean build package.json, 8) update source package.json version in-place, 9) git commit → push → tag, 10) npm publish from build dir, 11) verify the version on the registry. Push happens BEFORE publish and a failed push blocks that package's publish. Every phase is reported separately and a failed phase fails the run.
sidebar:
  order: 50
---

# Build pipeline

What pkgist does for each package, in order. Steps 4, 9, 10 and 11 are conditional; the rest run for every successful build.

## The 11 steps

```
1. Load source package.json → read current version
2. Resolve new version (auto-bump or explicit)
3. Create build output directory (buildDir/<package-name>/<new-version>/) — scope preserved as a directory
4. Snapshot source to sourcesDir/<package-name>/ — full copy excluding .git, node_modules, dist, .turbo, .cache
   (only if settings.sourcesDir is set)
5. Compile with tsdown → esm/ and cjs/ subdirectories
6. Clone extra files/directories listed in `clone`
7. Write clean package.json for the build (no devDeps, no scripts)
8. Update source package.json version in-place
9. Git: commit → push → tag v<version> → push tag
   (only if commit resolves to a non-empty string)
10. npm publish --access <public|restricted> from build directory
    (only if publish !== false AND the release commit is on the remote)
11. Read the version back from the registry to confirm it is actually served
    (unless --no-verify-publish)
```

Build, clone, write, git, and publish each happen in parallel across packages up to `concurrency`. Within one package, the steps are strictly sequential.

## Ordering rule: push before publish

**Git runs before npm publish, and a push that cannot be confirmed on the remote blocks that package's publish.**

Publishing is irreversible — a version cannot be unpublished outside npm's 72-hour window. A push is retryable forever. Doing the reversible thing first and ignoring its failure is how packages end up on npm with their source not in version control: the artifact exists and nobody can reproduce it from the tag history.

The tag is created only after the push lands, so a tag never points at a commit that is not on the remote.

Ordering alone does not close the window — a crash between push and publish leaves an unpublished pushed commit. That is the *recoverable* direction, which is why it is the right order. What closes the window is idempotence (below).

## Every step is check-then-act

Before acting, pkgist asks the remote what is already true, and skips what is done:

| Step | Question | If already true |
|---|---|---|
| commit | is the working tree dirty? | skip — nothing to commit |
| push | does the remote branch already point at this commit? | skip |
| tag | does the remote tag exist, and at this commit? | skip (or fail if it points elsewhere) |
| publish | does the registry already serve this version? | skip |

This is what makes a re-run safe. A non-idempotent retry creates fresh half-states — most obviously a tag pushed against a commit that never landed.

## Three states, never two

Remote probes answer `PRESENT`, `ABSENT`, or **`COULD-NOT-ASK`**.

`git ls-remote` prints nothing both when a ref is absent and when the network is unreachable, so any `grep -q` style check reports the second as the first. A sweep built that way once reported "0 of 26 tags present" when the true answer was "the network was down".

A phase pkgist could not evaluate is reported as `UNKNOWN`, is never counted as success, and makes the run exit non-zero. A tool that cannot reach the registry says so — it does not claim the package is missing, and it does not claim it is fine.

## Failure handling

- **Network-class failures are retried** — 3 attempts by default (`--retries <n>`), exponential backoff 1s / 2s / 4s, capped at 15s. Applies to push, tag push, and publish.
- **Non-network failures are never retried.** `E409` / `EPUBLISHCONFLICT` in particular usually means the previous attempt actually succeeded; the idempotence check above handles that, a retry would only produce a second confusing error. Auth failures are equally pointless to repeat.
- **Every phase records its own outcome** — `compile`, `commit`, `push`, `tag`, `publish`, `verify` — so the end-of-run summary names the phase, not just the package. Before 1.6.0 the git step was excluded from the success flag entirely, so failed pushes were invisible in the summary.
- **Any failed or unresolved phase fails the run** with a non-zero exit, and the word "successfully" is never printed.

## Build output structure

### With `preserveModules: true` (default)

Each source file becomes its own output file, mirroring the source tree. The package name (including any `@scope/`) is preserved verbatim as the directory path:

```
builds/
├── @mongez/                            ← scope directory for "@mongez/utils"
│   └── utils/
│       └── 2.1.1/
├── @warlock.js/                        ← another scope, side-by-side
│   └── core/
│       └── 4.1.16/
└── create-warlock/                     ← unscoped packages live at the root
    └── 4.1.16/
```

Inside any one versioned directory (e.g. `builds/@mongez/utils/2.1.1/`):

```
builds/@mongez/utils/2.1.1/
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

If `settings.sourcesDir` is set, pkgist archives a full copy of the source (minus `.git`, `node_modules`, `dist`, `.turbo`, `.cache`) into `<sourcesDir>/<package-name>/` before every build (scope preserved — `@mongez/cache` → `sources/@mongez/cache/`). Useful for:

- Reconstructing what was published at any point in time
- Diffing published versions without checking out specific tags
- Recovering from accidental source edits between build and publish

Omit `sourcesDir` to skip this step entirely.

## Publish step

`npm publish --access <public|restricted>` runs from the **build directory**, not the source. The build dir has the clean `package.json` + compiled output + cloned files — that's exactly what ships.

When `publish: false` is set on a package, the publish step is skipped (build + git still run). Use for internal-only packages.

`--no-publish` on the CLI skips the publish step for every package, regardless of config.

### "Published" means the registry serves it

After a publish reports success, pkgist reads the version back with `npm view <name>@<version> version`. A version the registry does not serve is a **failed publish**, no matter what the publish command's exit code said.

This is not belt-and-braces. `npm publish` has exited 0 for a package that never reached the registry; the run counted it as shipped, and because family members are pinned to each other at exact versions, the flagship package shipped declaring a dependency on a version that did not exist. Every internal signal agreed the release was fine. Only the registry told the truth.

`--no-verify-publish` skips the read-back. The final summary then says so in its last line, because a run that verified nothing must not report the same words as one that did.

## What's NOT in the pipeline

- **Running tests** — pkgist trusts you. Run your own test suite before invoking pkgist.
- **Linting / formatting** — same. Run as pre-commit hooks or separate CI steps.
- **Changelog generation** — pkgist doesn't write a CHANGELOG.md. Pair with conventional-changelog or release-please if you want one.
- **Dependency hoisting / workspace install** — pkgist doesn't touch `node_modules`. Run `yarn install` / `pnpm install` separately.

This keeps pkgist focused: take source, produce a clean publishable artifact, commit, tag, publish. The rest of the release lifecycle is your call.
