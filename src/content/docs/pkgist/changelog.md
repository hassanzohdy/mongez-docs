---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/pkgist` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



<details class="changelog-version" open>
<summary><span class="cl-version">[1.6.2]</span> <span class="cl-date">2026-08-12</span> <span class="cl-counts">Fixed (1)</span></summary>

### Fixed

- **The post-publish registry read-back no longer fails a healthy release.** 1.6.0 queried the registry once, immediately after `npm publish` returned. The registry does not always serve a version that instant, so a successful publish could be reported as `verify FAILED`, marking the run `INCOMPLETE` and exiting 1 while the version appeared on npm seconds later. Caught on the first real release after the check shipped (`@mongez/config@1.2.0` — flagged as absent, present on the registry moments afterwards).

  The read-back now retries while the answer is `absent` **or** `unknown`: 5 attempts with 1.5s / 3s / 5s / 8s backoff, roughly 17 seconds of tolerance before it declares a genuine failure. Only the **post**-publish check retries — the pre-publish "is this version already there?" probe still asks exactly once, because `absent` is its normal expected answer and retrying would add a pointless delay to every package in a release.

  This mattered more than an ordinary false positive: a spurious failure here is indistinguishable from the real defect the check exists to catch, and the fastest way to make an operator ignore a genuine broken-release warning is to cry wolf on a good one.

  The verification budget is deliberately separate from `--retries`, which governs transport failures. Waiting for propagation is a different thing from retrying a timeout.

### Tests

7 new assertions in `src/__tests__/settle-verification.test.ts` covering the production sequence (absent → absent → present), an unreachable registry that recovers, boundedness when the version never arrives, reporting the last unresolved answer rather than claiming success, and the backoff schedule. **61 passing.**

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.6.1]</span> <span class="cl-date">2026-08-11</span> <span class="cl-counts">Changed (2)</span></summary>

### Changed

- **CI now runs the test suite.** The Build workflow was `npm ci` + `npm run build` only, carrying a comment that said "pkgist ships no test suite" — stale as of 1.6.0, and it meant the 54 release-integrity assertions never ran anywhere but a developer's machine. A `Test` step runs `npm test` on all three matrix legs (Node 20 / 22 on Ubuntu, Node 20 on Windows) before the build.
- **Documented the lockfile trap in the workflow itself.** 1.6.0's release commit failed CI because `vitest` was added to `devDependencies` without refreshing `package-lock.json`, and `npm ci` rejects a mismatch. The non-obvious part is that inside the parent yarn workspace a plain `npm install --package-lock-only` reports "up to date" and writes nothing — the entry only lands with `npm install <pkg> --save-dev --package-lock-only --workspaces=false`. That is now a comment on the install step, where the next person will hit it.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.6.0]</span> <span class="cl-date">2026-08-11</span> <span class="cl-counts">Changed (7) · Added (3) · Fixed (1) · Notes for existing users (3)</span></summary>

**Release integrity.** Everything here closes one gap: pkgist reported the outcome of the run it *attempted*, not the outcome of the run that *happened*. Exit code, per-package status, and the final summary were all produced whether or not each step did what it was asked.

Reported by @Ion and @Nova after the `@warlock.js` 4.12.0 family release, where one package failed to upload twice and the run still ended in success — shipping a flagship package that pinned an exact sibling version which did not exist, uninstallable for ~40 minutes — and where 11 of 26 repositories published to npm with their release commit unpushed.

### Changed

- **Push now happens before publish, and a push that cannot be confirmed on the remote blocks that package's publish.** Publishing is irreversible outside npm's 72-hour window; a push is retryable forever. The previous order did the reversible thing first, warned when it failed, and then did the irreversible one anyway — producing published code whose source was not in version control, unreproducible from the tag history. The tag is now created only after the push lands, so a tag never points at a commit nobody else can see. A package that is **not** a git repository, or a run with `--no-git`, still publishes: that is a `skipped` push, not a failed one, and it is the legitimate case the old blanket "git is non-fatal" catch was really protecting.
- **A publish is only counted as published when the registry serves it.** After `npm publish` reports success, pkgist reads the version back with `npm view <name>@<version> version`. During the incident npm exited 0 for a package that never reached the registry — every internal signal agreed, and only a registry read told the truth. Disable with `--no-verify-publish`, which the summary then discloses.
- **The end-of-run summary is computed from per-phase outcomes, not a single boolean.** `BuildResult` now carries a `phases` array — `compile`, `commit`, `push`, `tag`, `publish`, `verify` — each `ok` / `skipped` / `failed` / `unknown`. Previously the summary read a `success` flag that the git step was *deliberately excluded from*, which is exactly why 11 failed pushes produced a success line. The summary now names every failure by package and by phase, and explicitly flags any package that published while its commit is not on the remote.
- **`build` accepts individual family members.** A family release that lost one package to a timeout can be finished with `pkgist build @scope/member --bump <exact-version>` instead of re-cutting all N — which previously meant re-attempting N-1 publishes that had to fail as duplicates, burying the one real failure among them. Without `--bump`, pkgist warns that it would create the family's *next* version rather than complete the existing one. Other members are untouched, and the summary says the run was a single member.
- **Every step is check-then-act against real remote state.** Before committing, pushing, tagging, or publishing, pkgist asks whether the work is already done and skips it if so. Re-running a partially-completed release now completes it instead of creating fresh half-states — most obviously a tag pushed against a commit that never landed.
- **`--no-publish` / `--no-git` / `--no-verify-publish` / `--dry-run` / a partial package selection are disclosed in the final line itself**, not a footnote. A shortened run that reports the same words as a full one is how a partial verification gets cited as a complete one.
- **A lockstep family that lost a member reports as BROKEN**, not "N of M succeeded". Members are pinned to each other at exact versions, so one missing member can make every other member uninstallable — "25 of 26" is not 96% of a release, it can be 0%.

### Added

- **Bounded retries with exponential backoff** on network-class failures (push, tag push, publish): 3 attempts by default, 1s / 2s / 4s, capped at 15s, configurable with `--retries <n>`. Every failure in the incident was transient and would have cleared on one retry. Retries are deliberately **not** unbounded — retrying into a rate limit makes it worse — and `E409` / `EPUBLISHCONFLICT` (version already exists) is never retried, because it usually means the previous attempt succeeded; the idempotence check handles that case instead. Auth failures are never retried either. An exhausted retry surfaces the failure; it never turns a hard failure into a quiet one.
- **A three-state answer for every remote probe: `PRESENT` / `ABSENT` / `COULD-NOT-ASK`.** `git ls-remote` prints nothing both when a ref is absent and when the network is unreachable, so a `grep -q` style check reports the second as the first — a sweep built that way once reported "0 of 26 tags present" when the network was simply down. A phase pkgist could not evaluate is reported `UNKNOWN`, is never counted as success, and makes the run exit non-zero.
- **A test suite.** 54 assertions across the retry classifier (what is and is not retryable, boundedness, fail-fast on duplicates), the registry decision table (including the property that nothing unreachable is ever reported as absent), and the run report (exit codes, phase naming, the "successfully" rule, narrowed-run disclosure).

### Fixed

- **A run that matched no packages now exits `1`.** `pkgist build <unknown-name>` warned and exited **0** — so a typo, or the documented single-member recovery command (which `build` used to reject outright), reported clean success having done nothing at all. Any script or CI step wrapping it saw success. `pkgist build` with neither names nor `--all` is likewise a usage error now, as is a `build:all` against a config with no packages.

### Notes for existing users

- `gitCommitTagPush` is replaced by `gitRelease`, which returns per-phase outcomes instead of throwing. Only relevant if you imported it directly — the CLI is unaffected.
- `BuildResult` gains a required `phases` field. `success` keeps its meaning but is now derived: true only when no phase failed or was unresolved.
- Runs that previously exited 0 while something failed will now exit 1. That is the point of the release, but it will surface pre-existing breakage in any CI that wraps pkgist.

</details>


<details class="changelog-version">
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
