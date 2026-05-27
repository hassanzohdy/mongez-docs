---
title: "Recipes"
name: mongez-agent-kit-recipes
description: |
  Idiomatic composition recipes for `@mongez/agent-kit` — `postinstall` sync, per-workspace `AGENTS.md` in a monorepo, selective target derivation, scoping skill discovery to specific npm scopes, watch mode in development, and a CI guardrail that fails if the derived files are out of date.
  TRIGGER when: code or `package.json` combines multiple agent-kit features (`postinstall` hook + scoped path + per-target derivation, CI verification, monorepo wiring); user asks "how do I run agent-kit on every install", "monorepo agent-kit setup", "how do I sync skills only from one scope", "how do I keep CLAUDE.md from drifting from AGENTS.md", or "how do I run agent-kit in watch mode".
  SKIP: bare CLI flag reference — load `mongez-agent-kit-cli-usage`; authoring `SKILL.md` to ship from an npm package — load `mongez-agent-kit-authoring-skills`; first-time mental model — load `mongez-agent-kit-overview`.
sidebar:
  order: 99
---

Cross-feature wiring patterns for `@mongez/agent-kit` — the configurations that come up when more than one tool, more than one package, or more than one environment is in play.

## `postinstall` sync — keep derived files current automatically

Run `agent-kit sync` after every `npm install` / `yarn install`. New skills shipped by a dependency become available immediately; `AGENTS.md` updates re-derive without anyone remembering to run a command.

```json
// package.json
{
  "scripts": {
    "postinstall": "agent-kit sync"
  },
  "devDependencies": {
    "@mongez/agent-kit": "^1.0.0"
  }
}
```

The sync is idempotent — running it twice is a no-op. CI installs get the same coverage as local installs.

## Per-workspace `AGENTS.md` in a monorepo

A monorepo where each package has its own conventions. Author one `AGENTS.md` per workspace; let agent-kit derive a `CLAUDE.md` / `.gemini/GEMINI.md` / `.github/copilot-instructions.md` next to each one.

```
repo/
├── AGENTS.md                  # repo-wide conventions
├── CLAUDE.md                  # derived
├── packages/
│   ├── api/
│   │   ├── AGENTS.md          # api-specific conventions (extends repo-wide)
│   │   └── CLAUDE.md          # derived from api/AGENTS.md
│   └── web/
│       ├── AGENTS.md
│       └── CLAUDE.md
```

Run sync from the repo root; agent-kit walks the workspace structure and derives at every `AGENTS.md` site.

```bash
npx agent-kit sync
```

Each editor opens the closest `*.md` to the file being edited, so contributors writing code in `packages/api/` get the api-specific config without manual selection.

## Selective target derivation

You use Claude Code and Cursor but not Aider or Gemini. Tell agent-kit to derive only what you need.

```bash
npx agent-kit sync --target claude,cursor
```

Or pin the choice in `package.json` so collaborators don't have to remember:

```json
{
  "agentKit": {
    "targets": ["claude", "cursor"]
  },
  "scripts": {
    "postinstall": "agent-kit sync"
  }
}
```

The non-selected targets' files are left untouched — they aren't deleted, they're just not regenerated.

## Scope skill discovery to one or two npm scopes

By default, agent-kit scans every installed package for a `skills/` folder. In a large repo this can be slow and noisy. Pin the scopes you actually want to vendor skills from.

```bash
npx agent-kit sync --path @mongez --path @warlock.js
```

Or in `package.json`:

```json
{
  "agentKit": {
    "paths": ["@mongez", "@warlock.js"]
  }
}
```

Now only `node_modules/@mongez/*/skills/` and `node_modules/@warlock.js/*/skills/` are crawled. Everything else is ignored. Use `--skills-only` to skip the AGENTS.md derivation pass on the same run.

## Watch mode while iterating on AGENTS.md

When you're actively rewriting `AGENTS.md` and want the derived files to update on save:

```bash
npx agent-kit watch
```

The process re-runs the sync on every file change in `AGENTS.md`, every workspace's `AGENTS.md`, and (if `--path` is set) every package's `SKILL.md`. Quit with Ctrl-C.

Useful in a side terminal while editing — pair with the same `--target` flag from the previous recipe to keep the noise down.

## CI guardrail: fail if derived files drifted

Catch the case where someone edited `AGENTS.md` but forgot to commit the re-derived `CLAUDE.md`. Run sync in CI, then check git for diffs.

```yaml
# .github/workflows/agents.yml
- run: npx agent-kit sync
- run: |
    if ! git diff --exit-code; then
      echo "::error::Derived agent files are stale — run 'npx agent-kit sync' and commit."
      exit 1
    fi
```

A green CI then proves: every committed `CLAUDE.md`, `.gemini/GEMINI.md`, etc. matches the corresponding `AGENTS.md`. Drift can't ship to main.

## Programmatic use — derive without spawning the CLI

For scripts that already run in Node (custom build steps, test fixtures, IDE plugins) skip the CLI overhead and call the API directly.

```ts
import { deriveAll, syncSkills, findProjectRoot } from "@mongez/agent-kit";

const root = await findProjectRoot();
await deriveAll({ root, targets: ["claude", "cursor"] });
await syncSkills({ root, paths: ["@mongez"] });
```

Same effect as `agent-kit sync --target claude,cursor --path @mongez` — useful inside a longer pipeline where you don't want a child-process boundary.
