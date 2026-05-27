---
title: "Agent Kit"
name: mongez-agent-kit-overview
description: |
  What agent-kit is, what it does, and when an agent should reach for it — the front-door mental model covering `AGENTS.md` derivation, npm-package skill distribution, flat folder naming (`<pkg-slug>-<skill-path>`), and the `.agent-kit-managed` sentinel.
  TRIGGER when: project contains `AGENTS.md`, `CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, or `CONVENTIONS.md`; folder `.claude/skills/<pkg-slug>-*/` or `.agent-kit-managed` sentinel exists; user asks "what is agent-kit", "how does AGENTS.md derivation work", "how do skills get into `.claude/skills/`", or "why is my skill folder named `<pkg-slug>-<skill>`"; `package.json` has `agentKit` config block or `postinstall: agent-kit sync`; `import { deriveAll, syncSkills, findProjectRoot } from "@mongez/agent-kit"`.
  SKIP: user is invoking, scripting, or debugging a specific CLI command / flag — load `mongez-agent-kit-cli-usage` instead; user is authoring a `SKILL.md` inside an npm package they publish — load `mongez-agent-kit-authoring-skills` instead; runtime AI features (model calls, embeddings) belong in `@warlock.js/ai*`, not here.
sidebar:
  order: 10
  label: "Overview"
---

`agent-kit` is a small CLI + library that solves two distinct but related problems for projects that work with AI coding agents:

1. **One `AGENTS.md`, every agent.** Most coding agents now read a project-level instructions file. `AGENTS.md` is the open standard — Codex, Cursor, Amp, Jules, Factory, Kilo, Windsurf, OpenCode, and others read it natively. But Claude Code, Gemini CLI, GitHub Copilot, and Aider each want their own file at their own path. `agent-kit` treats `AGENTS.md` as the single source of truth and derives the tool-specific files (`CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`) so they never drift.

2. **Skills travel with packages.** Any npm package can ship skills by dropping a `skills/` folder at its root — `agent-kit` auto-discovers them. `agent-kit sync` walks `node_modules/` (plus any extra paths via `--path`), finds those packages, and copies each skill into per-agent skill directories with **flat, collision-free folder names** like `.claude/skills/warlock-js-core-add-connector/SKILL.md`. Skills from removed packages are pruned automatically; user-authored skills sitting alongside ours are left untouched (we track ours with a `.agent-kit-managed` sentinel).

## Install

```sh
# npm
npm install -D @mongez/agent-kit

# yarn
yarn add -D @mongez/agent-kit

# pnpm
pnpm add -D @mongez/agent-kit
```

The npm package is `@mongez/agent-kit`; the CLI binary is just `agent-kit`. Install with the scope, invoke without it.

## Quick example

Bootstrap a fresh project in one command. The starter `AGENTS.md` lands at the project root (only if missing), and every per-tool file derives from it:

```sh
npx agent-kit init
```

Then wire `sync` into `postinstall` so every future `yarn install` / `npm install` re-derives the per-tool files and mirrors skills from installed packages:

```json
{
  "scripts": {
    "postinstall": "agent-kit sync"
  }
}
```

From here, edit `AGENTS.md` once, run `npx agent-kit sync`, and every supported agent (Claude Code, Cursor, Copilot, Aider, Codex, …) picks up the change.

## When to use it

- A project adopting AI coding agent workflows wants a single source of truth for project instructions.
- A package author wants to ship reusable skills that downstream consumers can use without copy-paste.
- Project maintainers want to keep `CLAUDE.md`, `.gemini/GEMINI.md`, etc. in sync with `AGENTS.md` automatically.

## When NOT to use it

- You only target a single coding agent and never plan to change. Just write its native file directly.
- You want runtime AI features (model calls, prompts, embeddings). Those live in `@warlock.js/ai*`, not here.
- You want to publish docs for browsing LLMs (`llms.txt`, `llms-full.txt`) for your app. Different audience, different lifecycle.

## Mental model

Source of truth → derivation → distribution.

```
AGENTS.md                  ← you write this once
   │
   ▼  agent-kit sync (derivation)
CLAUDE.md
.gemini/GEMINI.md
.github/copilot-instructions.md
CONVENTIONS.md

node_modules/@scope/pkg/skills/foo/SKILL.md
   │
   ▼  agent-kit sync (skills distribution)
.claude/skills/scope-pkg-foo/SKILL.md
.cursor/skills/scope-pkg-foo/SKILL.md
```

## Key principles

- **Folder name = identity.** Claude Code routes by folder name; the SKILL.md frontmatter `name:` field is purely cosmetic. agent-kit derives the destination folder as `<pkg-slug>[-skill-path]` — collisions impossible by construction.
- **SKILL.md content is copied verbatim.** agent-kit never reads or rewrites frontmatter.
- **Sentinel-based prune.** Only folders with `.agent-kit-managed` get blown away on re-sync. Your hand-authored skills are safe.
- **Stateless.** Every sync re-derives from disk truth. No lockfile, no cache, no "did sync forget to update state?" bugs.

## Companion skills

- `cli-usage` — exact commands and flags
- `authoring-skills` — how to ship skills from your own package
