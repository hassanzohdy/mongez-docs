---
title: "Recipes"
name: mongez-agent-kit-recipes
description: |
  Cross-feature wiring patterns for `@mongez/agent-kit` — per-workspace `AGENTS.md` in a monorepo, `pick`/`omit` filtering when a dependency ships skills you don't want, a CI guardrail that fails if the derived files drifted, the programmatic API for non-CLI pipelines, and watch mode for active development.
sidebar:
  order: 99
---

Configurations that come up when more than one tool, more than one package, or more than one environment is in play. For straightforward setup (`npx agent-kit init` + per-IDE `--target`), see **[Agent integrations](../agent-integrations/)**. For flag-level CLI reference, see **[CLI usage](../cli-usage/)**.

## Per-workspace `AGENTS.md` in a monorepo

> Aggregating **skills** from sibling projects into one root session has its own dedicated page — see **[Monorepos](../monorepos/)** for `--projects` / `agentKit.monorepo.projects`. This recipe is specifically about per-workspace **instruction files** (`CLAUDE.md`).

A monorepo where each package has its own conventions. `agent-kit` operates on the directory you point it at via `--cwd`, deriving one set of per-tool files per project root. To get per-workspace `CLAUDE.md` files, run sync inside each workspace.

```
repo/
├── AGENTS.md                  # repo-wide conventions
├── CLAUDE.md                  # derived
├── packages/
│   ├── api/
│   │   ├── AGENTS.md          # api-specific conventions
│   │   └── CLAUDE.md          # derived from api/AGENTS.md
│   └── web/
│       ├── AGENTS.md
│       └── CLAUDE.md
```

Drive it from a workspace-aware script (yarn workspaces foreach, pnpm -r, turbo run, etc.) so every package re-derives on install:

```bash
npx agent-kit sync --cwd packages/api
npx agent-kit sync --cwd packages/web
```

Each editor opens the closest `*.md` to the file being edited, so contributors working in `packages/api/` get the api-specific config without manual selection.

## Filter skills from a noisy dependency

By default, agent-kit scans every installed package under `node_modules/` for a `skills/` folder and exports them all. When a dependency ships skills you don't want — too many, off-topic, duplicate with your own — use `pick` (allowlist) or `omit` (denylist) in `package.json`.

```json
{
  "agentKit": {
    "omit": {
      "@some-vendor/sdk": true,
      "@warlock.js/core": ["add-connector", "send-response"]
    }
  }
}
```

`true` drops the whole package; a string array drops specific skills by their **source folder name** (not the destination slug). The next `agent-kit sync` skips them entirely.

To go the other way — only sync a curated allowlist:

```json
{
  "agentKit": {
    "pick": {
      "@warlock.js/core": true,
      "@mongez/agent-kit": ["overview"]
    }
  }
}
```

`pick` runs first to allowlist packages; `omit` runs after to drop specific skills from what survived. Both fields together let you say "include `@warlock.js/core` but skip its noisy `add-connector` skill" in one config block.

## CI guardrail: fail if the derived files drifted

Catch the case where someone edited `AGENTS.md` but forgot to commit the re-derived `CLAUDE.md` / `.gemini/GEMINI.md` / etc. Run `sync` in CI, then check git for unexpected diffs.

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

## Programmatic use — skip the CLI boundary

For scripts that already run in Node (custom build steps, test fixtures, IDE plugins, internal CLIs) skip spawning a child process and call the API directly.

```ts
import { deriveAll, syncSkills, findProjectRoot } from "@mongez/agent-kit";

const root = await findProjectRoot();
if (!root) throw new Error("No package.json found");

await deriveAll({ root, targets: ["claude"] });
await syncSkills({
  root,
  targets: ["claude", "cursor"],
  scanPaths: ["@warlock.js"],
});
```

Equivalent to `agent-kit sync --target claude,cursor --path @warlock.js` but inside a longer pipeline without a process-boundary. Note: the API takes `scanPaths` (plural array); the CLI flag is `--path` (comma-separated string).

Every exported function — `deriveAll`, `syncSkills`, `findProjectRoot`, `scanForSkillPackages`, `deriveSlugForSkill`, `loadAgentKitConfig` — is fully typed. See **[Overview](../overview/)** for the full API surface.

## Watch mode while iterating on AGENTS.md or local skills

When you're actively rewriting `AGENTS.md` or editing a local `skills/<name>/SKILL.md` and want the derived files + mirrored destinations updated on save:

```bash
npx agent-kit watch
npx agent-kit watch --path packages   # also watch a monorepo's workspaces
```

The process re-runs sync on every change with a 150ms debounce. Useful in a side terminal while editing. Pair with `--target` to keep the noise down to just the agents you actually use.

Without `--path`, watch tracks `AGENTS.md` + your project's own `skills/**/SKILL.md` + `node_modules/**/skills/**/SKILL.md`. With `--path`, the listed directories are watched the same way — packages there win on dedupe over `node_modules/`, so your local edits always take precedence.
