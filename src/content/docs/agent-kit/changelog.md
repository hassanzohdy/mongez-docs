---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/agent-kit` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-06-04

### Added

- **Monorepo skill aggregation (`--projects` / `agentKit.monorepo.projects`).** Run `agent-kit sync` once at a full-stack repo root and pull skills up from sibling projects (`backend`, `frontend`, …) into the single root skills directory that agents actually read. Each declared project is scanned **as its own project**: its `node_modules/` dependency skills (filtered by **that project's own** `agentKit.pick`/`omit`) plus its authored `skills/` folder, exported with the **project directory name** as the slug prefix (`backend/skills/code-standards` → `backend-code-standards`) so two projects can ship a same-named skill without colliding. Shared dependencies dedupe to one copy (the union of what each project kept); the root's own `omit` applies as a global veto. Accepts literal dirs and one-level globs (`apps/*`). New `--projects` flag on `sync` and `watch`, `agentKit.monorepo.projects` config, and exported `resolveMonorepoProjects` / `scanProject` / `scanProjects` (with `ResolvedProject` / `ProjectScanResult` types). `syncSkills` gains a `projects` option and a `projects` field on its result.

### Fixed

- **`agent-kit watch` now actually re-syncs on skill edits.** chokidar v4+ removed glob support, so the previous `skills/**/SKILL.md` watch patterns were treated as literal paths and silently matched nothing — only `AGENTS.md` edits triggered a re-sync. Watch now resolves the real skill-source **directories** (root `skills/`, each `--path` package's `skills/`, each `--projects` project's `skills/` + `package.json`) and watches those. `node_modules/` dependency skills are intentionally not watched — they change only on (re)install, which fires `postinstall` → `sync`.
- **`agent-kit --version` reports the real version.** It was hardcoded to `0.1.0`; it now reads the installed `package.json` at runtime.

### Removed

- **Stale `SyncResult` public type.** It never matched any function's actual return shape (`syncSkills` returns `SkillsSyncResult`, `deriveAll` returns `DeriveResult[]`) and was unused. Dropped from the type exports.

---

## [1.0.23] — 2026-05-29

### Fixed

- **Correct repository ownership in links.** `agent-kit` lives at [`hassanzohdy/agent-kit`](https://github.com/hassanzohdy/agent-kit), not `warlockjs/agent-kit`. Fixed the stale repo URLs in `llms.txt` and, more importantly, in the starter `AGENTS.md` that `agent-kit init` scaffolds (it was baking the wrong link into every consumer's file). Replaced the internal `warlockjs/warlock` design-spec link with the public docs site.

---

## [1.0.22] — 2026-05-29

### Changed

- **Docs now foreground organizing your *own* project's skills.** The README, bundled skills (`overview`, `authoring-skills`), and `llms`/`llms-full` files now lead with the everyday case: keep a single nested `skills/` folder at your project root (`skills/backend/auth/SKILL.md`) and `agent-kit sync` flattens it into the top-level `.claude/skills/` layout Claude Code requires. Shipping skills from an npm package is now framed as the same mechanism applied to `node_modules/`. No code/API changes.

---

## [1.0.21] — 2026-05-29

### Fixed

- **Linux skill discovery crash when a scan path's root holds a `package.json` file** — `readTextFile` now treats `ENOTDIR` and `EISDIR` as "no file here" (returning `null`), the same as `ENOENT`. Previously, probing a manifest path whose parent is a file (e.g. `package.json/package.json`, which happens when a scan path points at a project root) threw `ENOTDIR` on Linux but `ENOENT` on Windows — so discovery crashed on Linux only. Both platforms now behave identically.

---

## [1.0.20] — 2026-05-29

### Fixed

- **Cross-platform skill discovery order** — `scanForSkillPackages` and the nested-skill walk now sort their `readdir` results, so the set and order of discovered skills is identical on Linux (ext4) and Windows (NTFS). Previously the order tracked raw directory order, which differs per filesystem and made order-sensitive output non-deterministic in CI.

### Added

- **CI test workflow** — `.github/workflows/test.yml` runs the suite on Node 20/22 (ubuntu) plus Node 20 (windows) for path/CRLF coverage. Node 18 is excluded because a transitive test dependency (`chokidar@5`) requires Node >=20.19; the CLI itself still runs on Node 18+ at runtime.

---

## [1.0.19] — 2026-05-29 — Docs overhaul

### Added

- **`agent-integrations` skill** — per-IDE setup walkthroughs for Claude Code, Cursor, Codex, Kiro, Gemini CLI, GitHub Copilot, Aider, and Antigravity. Each covers the exact `--target` flag, the files agent-kit creates, and the reload quirk; honest about Gemini/Aider being derive-only (no skills directory convention).
- **README "Set up with your agent" section** — a compact per-agent table (target / derived file / skills folder / reload) plus multi-agent guidance.

### Changed

- **Recipes refreshed** — dropped duplicates that overlapped the overview and CLI pages; kept the genuinely cross-cutting patterns (monorepo wiring, `pick`/`omit` filtering, CI drift guardrail, programmatic API, watch mode).
- **Overview rewritten** — narrative intro, highlight cards, quick peek, and a developer-vs-package-author split in "Where to go next".

### Removed

- **`when_to_use` guidance** — dropped the `when_to_use` frontmatter convention from the authoring guide and all skill files. `description` now carries both discovery and activation; the authoring guide explains how to write it for both roles.

> No code/API changes — `deriveAll`, `syncSkills`, the CLI, and the exports map are unchanged. Documentation and bundled-skill content only.

---

## [1.0.x] — Earlier releases

Version history prior to this changelog is available via the git tags and GitHub releases on [hassanzohdy/agent-kit](https://github.com/hassanzohdy/agent-kit).
