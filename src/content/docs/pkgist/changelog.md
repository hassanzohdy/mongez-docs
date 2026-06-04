---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/pkgist` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0]

### Added

- **Intra-family dependency pinning.** In a family build, any `dependencies` / `peerDependencies` entry that names another family member is now pinned to the **exact** shared release version in the published `package.json` (the source keeps `"*"` for workspace linking). Standalone builds are unaffected. This stops `"*"` from leaking to consumers and keeps a released family installable as one coherent, same-version set.
- **`changelog` skill** (`skills/changelog/`) mirroring this page — so version history auto-loads for AI agents and is tracked on every release.

### Fixed

- **`--no-git` is now honoured.** commander stores the negated flag under its positive attribute (`git === false`), but the build commands read `opts.noGit` (always `undefined`), so `--no-git` was silently ignored and git still ran. The commands now read the raw `git` attribute, mirroring the existing `--no-publish` handling. Affects `build`, `build:family`, and `build:all`.
- **`src/build/` is tracked by git again.** A bare `build` line in `.gitignore` matches at any depth, which silently untracked the entire build-pipeline source (`package-builder.ts`, `family-builder.ts`, `parallel-builder.ts`, `index.ts`) — including the dependency-pinning wiring. The ignore rules are now anchored to the package root (`/dist`, `/build`).
- **The published `pkgist` CLI binary works.** `bin` pointed at `dist/cli.js` — the local tsup-dev layout, which is **absent** from the engine-built package (it ships `cjs/` + `esm/`, no `dist/`). `bin` now points at `cjs/cli.cjs`, the real build output, so `npm i -g @mongez/pkgist` produces a working `pkgist` command.

### Docs

- Documented intra-family dependency pinning across the `versioning` + `pipeline` skills, README, this docs site, and `llms-full.txt`.
- Corrected long-standing drift in `llms-full.txt`: the "kept fields" list (dropped the fields that pkgist actually strips), the source-snapshot exclusion list (added `.turbo`, `.cache`), and the config auto-discovery note (six filenames, not two).
- Aligned the documented git pipeline to the real commands: `git add -A` and `git push origin --tags`.

## [1.1.3]

### Added

- Per-topic skills (`skills/`) plus `llms.txt` / `llms-full.txt` for AI-agent auto-loading, an expanded install section (npm / yarn / pnpm) with a CLI quick example, and a CI build smoke-test workflow (Node 20/22 on Ubuntu, Node 20 on Windows).

### Fixed

- Reconciled several documentation drift items against source during a skills polish pass.

## [1.1.2]

### Added

- This changelog. No code changes — the package remains the tsdown-powered build/version/publish tool: standalone + version-synchronised families, dual ESM+CJS output, asset cloning, git tag + push automation, and `--dry-run`.

> Version history prior to 1.1.0 is available via the git tags and GitHub releases on [hassanzohdy/pkgist](https://github.com/hassanzohdy/pkgist).

## [1.1.0]

### Added

- **`commit` field accepts `true` / `false`** in addition to a string. `true` auto-generates a `Released <version>` message (set-and-forget); `false` explicitly skips git; a string is used verbatim; omitting it skips git (back-compat).
