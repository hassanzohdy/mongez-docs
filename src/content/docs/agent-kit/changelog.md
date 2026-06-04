---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/agent-kit` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



<details class="changelog-version" open>
<summary><span class="cl-version">[1.1.1]</span> <span class="cl-date">2026-06-04</span> <span class="cl-counts">Added (1) · Changed (1)</span></summary>

### Added

- **`## Skills` section in the scaffolded `AGENTS.md`.** `agent-kit init` now writes an agent-neutral instruction telling the AI agent to check available skills *before* searching the codebase or reverse-engineering a package's API from its source — closing the gap where agents ignored installed skills. Worded for any agent (Claude Code, Cursor, Codex, Copilot, Gemini, …), not just one.

### Changed

- **Docs lead with the no-install bootstrap.** `npx @mongez/agent-kit@latest init` (scoped, always-latest, zero install) is now the documented entry point, with the `init` vs `sync` delivery model spelled out: `init` is a one-time scaffold (always-latest npx is ideal); `sync` runs on every install + in CI and belongs as a **pinned dev dependency** (never always-latest, which could silently change generated output). Clarifies that the **scoped** name is required with `npx` — `npx agent-kit` (unscoped) resolves a different package.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.0]</span> <span class="cl-date">2026-06-04</span> <span class="cl-counts">Added (6) · Fixed (2) · Removed (1)</span></summary>

### Added

- **Monorepo skill aggregation** via `--projects` and `agentKit.monorepo.projects` — run `agent-kit sync` once at a repo root to pull skills from sibling projects (`backend`, `frontend`, …) into the single root skills dir agents read.
- Each project is scanned **as its own project**: its `node_modules/` deps (filtered by *that project's own* `pick`/`omit`) plus its authored `skills/`.
- Authored skills are prefixed with the **project directory name** (`backend/skills/code-standards` → `backend-code-standards`) so same-named skills across projects don't collide.
- Shared dependencies dedupe to one copy (union of kept skills); the root's `omit` applies as a global veto.
- Project patterns accept literal dirs and one-level globs (`apps/*`).
- New `--projects` flag on `sync` and `watch`; new exports `resolveMonorepoProjects` / `scanProject` / `scanProjects` (+ `ResolvedProject` / `ProjectScanResult` types); `syncSkills` gains a `projects` option and result field.

### Fixed

- **`agent-kit watch` re-syncs on skill edits again** — chokidar v4+ dropped glob support, so the old `skills/**/SKILL.md` watch patterns matched nothing (only `AGENTS.md` fired). Watch now watches the real skill-source directories.
- **`agent-kit --version`** reports the real version (was hardcoded to `0.1.0`; now read from `package.json` at runtime).

### Removed

- **Stale `SyncResult` type** — it never matched any function's return shape and was unused. Dropped from the exports.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.23]</span> <span class="cl-date">2026-05-29</span> <span class="cl-counts">Fixed (1)</span></summary>

### Fixed

- **Correct repository ownership in links.** `agent-kit` lives at [`hassanzohdy/agent-kit`](https://github.com/hassanzohdy/agent-kit), not `warlockjs/agent-kit`. Fixed the stale repo URLs in `llms.txt` and, more importantly, in the starter `AGENTS.md` that `agent-kit init` scaffolds (it was baking the wrong link into every consumer's file). Replaced the internal `warlockjs/warlock` design-spec link with the public docs site.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.22]</span> <span class="cl-date">2026-05-29</span> <span class="cl-counts">Changed (1)</span></summary>

### Changed

- **Docs now foreground organizing your *own* project's skills.** The README, bundled skills (`overview`, `authoring-skills`), and `llms`/`llms-full` files now lead with the everyday case: keep a single nested `skills/` folder at your project root (`skills/backend/auth/SKILL.md`) and `agent-kit sync` flattens it into the top-level `.claude/skills/` layout Claude Code requires. Shipping skills from an npm package is now framed as the same mechanism applied to `node_modules/`. No code/API changes.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.21]</span> <span class="cl-date">2026-05-29</span> <span class="cl-counts">Fixed (1)</span></summary>

### Fixed

- **Linux skill discovery crash when a scan path's root holds a `package.json` file** — `readTextFile` now treats `ENOTDIR` and `EISDIR` as "no file here" (returning `null`), the same as `ENOENT`. Previously, probing a manifest path whose parent is a file (e.g. `package.json/package.json`, which happens when a scan path points at a project root) threw `ENOTDIR` on Linux but `ENOENT` on Windows — so discovery crashed on Linux only. Both platforms now behave identically.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.20]</span> <span class="cl-date">2026-05-29</span> <span class="cl-counts">Fixed (1) · Added (1)</span></summary>

### Fixed

- **Cross-platform skill discovery order** — `scanForSkillPackages` and the nested-skill walk now sort their `readdir` results, so the set and order of discovered skills is identical on Linux (ext4) and Windows (NTFS). Previously the order tracked raw directory order, which differs per filesystem and made order-sensitive output non-deterministic in CI.

### Added

- **CI test workflow** — `.github/workflows/test.yml` runs the suite on Node 20/22 (ubuntu) plus Node 20 (windows) for path/CRLF coverage. Node 18 is excluded because a transitive test dependency (`chokidar@5`) requires Node >=20.19; the CLI itself still runs on Node 18+ at runtime.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.19]</span> <span class="cl-date">2026-05-29</span> <span class="cl-label">Docs overhaul</span> <span class="cl-counts">Added (2) · Changed (2) · Removed (1)</span></summary>

### Added

- **`agent-integrations` skill** — per-IDE setup walkthroughs for Claude Code, Cursor, Codex, Kiro, Gemini CLI, GitHub Copilot, Aider, and Antigravity. Each covers the exact `--target` flag, the files agent-kit creates, and the reload quirk; honest about Gemini/Aider being derive-only (no skills directory convention).
- **README "Set up with your agent" section** — a compact per-agent table (target / derived file / skills folder / reload) plus multi-agent guidance.

### Changed

- **Recipes refreshed** — dropped duplicates that overlapped the overview and CLI pages; kept the genuinely cross-cutting patterns (monorepo wiring, `pick`/`omit` filtering, CI drift guardrail, programmatic API, watch mode).
- **Overview rewritten** — narrative intro, highlight cards, quick peek, and a developer-vs-package-author split in "Where to go next".

### Removed

- **`when_to_use` guidance** — dropped the `when_to_use` frontmatter convention from the authoring guide and all skill files. `description` now carries both discovery and activation; the authoring guide explains how to write it for both roles.

> No code/API changes — `deriveAll`, `syncSkills`, the CLI, and the exports map are unchanged. Documentation and bundled-skill content only.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.x]</span> <span class="cl-label">Earlier releases</span></summary>

Version history prior to this changelog is available via the git tags and GitHub releases on [hassanzohdy/agent-kit](https://github.com/hassanzohdy/agent-kit).

</details>
