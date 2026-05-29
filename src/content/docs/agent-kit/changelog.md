---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/agent-kit` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.22]

### Changed

- **Docs now foreground organizing your *own* project's skills.** The README, bundled skills (`overview`, `authoring-skills`), and `llms`/`llms-full` files now lead with the everyday case: keep a single nested `skills/` folder at your project root (`skills/backend/auth/SKILL.md`) and `agent-kit sync` flattens it into the top-level `.claude/skills/` layout Claude Code requires. Shipping skills from an npm package is now framed as the same mechanism applied to `node_modules/`. No code/API changes.

---

## [1.0.21]

### Fixed

- **Linux skill discovery crash when a scan path's root holds a `package.json` file** — `readTextFile` now treats `ENOTDIR` and `EISDIR` as "no file here" (returning `null`), the same as `ENOENT`. Previously, probing a manifest path whose parent is a file (e.g. `package.json/package.json`, which happens when a scan path points at a project root) threw `ENOTDIR` on Linux but `ENOENT` on Windows — so discovery crashed on Linux only. Both platforms now behave identically.

---

## [1.0.20]

### Fixed

- **Cross-platform skill discovery order** — `scanForSkillPackages` and the nested-skill walk now sort their `readdir` results, so the set and order of discovered skills is identical on Linux (ext4) and Windows (NTFS). Previously the order tracked raw directory order, which differs per filesystem and made order-sensitive output non-deterministic in CI.

### Added

- **CI test workflow** — `.github/workflows/test.yml` runs the suite on Node 20/22 (ubuntu) plus Node 20 (windows) for path/CRLF coverage. Node 18 is excluded because a transitive test dependency (`chokidar@5`) requires Node >=20.19; the CLI itself still runs on Node 18+ at runtime.

---

## [1.0.19] — Docs overhaul

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
