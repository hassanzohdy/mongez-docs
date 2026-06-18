---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/pkgist` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



<details class="changelog-version" open>
<summary><span class="cl-version">[1.5.0]</span> <span class="cl-date">2026-06-06</span> <span class="cl-counts">Changed (1)</span></summary>

### Changed

- **Build output and source snapshots now preserve the package scope as a directory.** Previously the scope was stripped, flattening every package into a single level (`@mongez/cache` → `builds/cache/<version>/`) and risking name collisions across scopes. Scoped packages now land at `<buildDir>/<scope>/<name>/<version>/` (e.g. `builds/@mongez/cache/1.3.5/`); unscoped packages stay at the root (e.g. `builds/create-warlock/4.1.16/`). Source snapshots follow the same shape (`<sourcesDir>/<scope>/<name>/`). The change mirrors how `node_modules/@scope/...` is laid out and keeps a release runner that hosts many scopes (`@mongez` + `@warlock.js` side by side) organised on disk.

  **Migration:** existing artifacts at the old flat paths are orphaned by the upgrade. Either delete them, move them under the new `<scope>/` directory, or just let the next build re-populate. No `pkgist.config.ts` change is required — `buildDir` and `sourcesDir` keep their existing values; only the per-package leaf path changes.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.4.0]</span> <span class="cl-date">2026-06-06</span> <span class="cl-counts">Added (1)</span></summary>

### Added

- **Per-run `--bump` and `--commit` CLI overrides** on `build`, `build:family`, and `build:all`. `--bump <strategy>` overrides the configured `version` for that invocation (`patch` / `minor` / `major` / `auto` / an explicit `x.y.z`); `--commit [message]` overrides the configured `commit` (a message string, or a bare `--commit` to auto-generate `Released <version>`). Both apply to the single run only and **never mutate `pkgist.config.ts`** — so the config file stays a static package registry and concurrent release sessions no longer clobber each other's `version` / `commit` edits. Precedence: CLI flag > family-level `commit` > per-package config; `--no-git` still overrides any resolved commit message. The version flag is named `--bump` (not `--version`) because commander reserves `--version` for the root `pkgist --version` printer.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.3.0]</span> <span class="cl-date">2026-06-04</span> <span class="cl-counts">Added (1) · Changed (3) · Fixed (1) · Docs (2)</span></summary>

### Added

- **`pkgist init` command.** Scaffolds a `pkgist.config.ts` in the current directory (`buildDir: "./builds"`, `sourcesDir: "./sources"`, one example package). Skips an existing config unless `--force` is passed — the fastest path from `npm install` to a working config.

### Changed

- **Single config file.** Config discovery now recognises only `pkgist.config.ts` (then `pkgist.config.js`). The `builder.ts` / `builder.js` / `mongez.ts` / `mongez.js` legacy aliases are gone — one obvious config name, no guessing. Pass `--config <path>` for a custom location. *Migration: rename `builder.ts` → `pkgist.config.ts`.*
- The shipped example template is renamed `builder.example.ts` → `pkgist.config.example.ts`.
- **pkgist now publishes ESM-only** (`mainType: "esm"`, `formats: ["esm"]`). It targets Node 18+.

### Fixed

- **The published `pkgist` CLI binary runs.** Earlier releases shipped a CommonJS binary (`cjs/cli.cjs`) that crashed on the first log line — `chalk` v5 is ESM-only and can't be `require`d from CommonJS. Publishing ESM-only (`bin` → `esm/cli.mjs`) means `npx pkgist`, `pkgist init`, and every other command actually work for installed consumers. (Internal monorepo releases were unaffected because they run the ESM engine, not the published binary.)

### Docs

- Rewrote the README into a professional, beginner→advanced reference (badges, "Why pkgist?", feature table, quick start, then config → package options → versioning → git → CLI → pipeline → recipes).
- Every changelog entry is now dated — here, in the docs Change Logs page, and in the `changelog` skill.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.2.0]</span> <span class="cl-date">2026-06-04</span> <span class="cl-counts">Added (2) · Fixed (3) · Docs (3)</span></summary>

### Added

- **Intra-family dependency pinning.** In a family build, any `dependencies` / `peerDependencies` entry that names another family member is now pinned to the **exact** shared release version in the published `package.json` (the source keeps `"*"` for workspace linking). Standalone builds are unaffected. This stops `"*"` from leaking to consumers and keeps a released family installable as one coherent, same-version set.
- **`changelog` skill** (`skills/changelog/`) mirroring this file, plus a Change Logs page in the docs site — so version history auto-loads for AI agents and is tracked on every release.

### Fixed

- **`--no-git` is now honoured.** commander stores the negated flag under its positive attribute (`git === false`), but the build commands read `opts.noGit` (always `undefined`), so `--no-git` was silently ignored and git still ran. The commands now read the raw `git` attribute, mirroring the existing `--no-publish` handling. Affects `build`, `build:family`, and `build:all`.
- **`src/build/` is tracked by git again.** A bare `build` line in `.gitignore` matches at any depth, which silently untracked the entire build-pipeline source (`package-builder.ts`, `family-builder.ts`, `parallel-builder.ts`, `index.ts`) — including the dependency-pinning wiring. The ignore rules are now anchored to the package root (`/dist`, `/build`).
- **The published `pkgist` CLI binary works.** `bin` pointed at `dist/cli.js` — the local tsup-dev layout, which is **absent** from the engine-built package (it ships `cjs/` + `esm/`, no `dist/`). `bin` now points at `cjs/cli.cjs`, the real build output, so `npm i -g @mongez/pkgist` produces a working `pkgist` command.

### Docs

- Documented intra-family dependency pinning across the `versioning` + `pipeline` skills, README, the docs site, and `llms-full.txt`.
- Corrected long-standing drift in `llms-full.txt`: the "kept fields" list (dropped the fields that pkgist actually strips), the source-snapshot exclusion list (added `.turbo`, `.cache`), and the config auto-discovery note (six filenames, not two).
- Aligned the documented git pipeline to the real commands: `git add -A` and `git push origin --tags`.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.3]</span> <span class="cl-date">2026-06-03</span> <span class="cl-counts">Added (1) · Fixed (1)</span></summary>

### Added

- Per-topic skills (`skills/`) plus `llms.txt` / `llms-full.txt` for AI-agent auto-loading, an expanded install section (npm / yarn / pnpm) with a CLI quick example, and a CI build smoke-test workflow (Node 20/22 on Ubuntu, Node 20 on Windows).

### Fixed

- Reconciled several documentation drift items against source during a skills polish pass.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.2]</span> <span class="cl-date">2026-05-29</span> <span class="cl-counts">Added (1)</span></summary>

### Added

- This changelog. No code changes — the package remains the tsdown-powered build/version/publish tool: standalone + version-synchronised families, dual ESM+CJS output, asset cloning, git tag + push automation, and `--dry-run`.

> Version history prior to 1.1.0 is available via the git tags and GitHub releases on [hassanzohdy/pkgist](https://github.com/hassanzohdy/pkgist).

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.0]</span> <span class="cl-date">2026-05-27</span> <span class="cl-counts">Added (1)</span></summary>

### Added

- **`commit` field accepts `true` / `false`** in addition to a string. `true` auto-generates a `Released <version>` message (set-and-forget); `false` explicitly skips git; a string is used verbatim; omitting it skips git (back-compat).

</details>
