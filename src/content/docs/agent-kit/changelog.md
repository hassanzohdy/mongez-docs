---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/agent-kit` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
