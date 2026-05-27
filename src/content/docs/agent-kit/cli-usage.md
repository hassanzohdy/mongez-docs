---
title: "CLI usage"
name: mongez-agent-kit-cli-usage
description: |
  Exact commands, flags, and typical wiring for the `agent-kit` CLI (`init` / `sync` / `watch`) and its programmatic counterparts.
  TRIGGER when: command line invokes `agent-kit init`, `agent-kit sync`, or `agent-kit watch` (or `npx agent-kit ...`); `package.json` has `"postinstall": "agent-kit sync"` or any `agent-kit` script; flags `--target`, `--path`, `-p`, `--override`, `--skills-only`, `--derive-only`, `--cwd` appear; user asks "how do I wire agent-kit into CI / postinstall / monorepo", "what does `--path` do", "how do I run agent-kit on every install", or "how do I sync skills for cursor/claude/copilot"; code imports `deriveAll`, `syncSkills`, `findProjectRoot`, `scanForSkillPackages`, or `deriveSlugForSkill` from `@mongez/agent-kit`.
  SKIP: general "what is agent-kit / mental model" questions — load `mongez-agent-kit-overview` instead; authoring a `SKILL.md` to ship from an npm package — load `mongez-agent-kit-authoring-skills` instead; tasks unrelated to invoking the agent-kit binary or its API.
sidebar:
  order: 50
---

Three commands. All are idempotent — running them twice in a row is a no-op the second time.

## `agent-kit init`

Scaffold a starter `AGENTS.md` (only if it does not exist) and derive the per-tool files from it.

```bash
npx agent-kit init
```

Flags:

- `--cwd <path>` — start from a different working directory (defaults to `process.cwd()`).

Behavior:

- If `AGENTS.md` exists → leave it alone.
- If `AGENTS.md` is missing → write a starter template.
- Always derives `CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`.

## `agent-kit sync`

Re-derive the per-tool files from `AGENTS.md` and export skills from installed packages.

```bash
npx agent-kit sync
npx agent-kit sync --target claude,cursor
npx agent-kit sync --derive-only
npx agent-kit sync --skills-only
npx agent-kit sync --path @warlock.js
npx agent-kit sync --override
```

Flags:

- `--cwd <path>` — working directory override.
- `--target <names>` — comma-separated skill targets. Valid: `claude`, `copilot`, `cursor`, `codex`, `opencode`, `amp`, `goose`, `kiro`, `antigravity`. Defaults to `claude`.
- `--derive-only` — skip skills export.
- `--skills-only` — skip derivation.
- `--path <dirs>` / `-p` — comma-separated extra dirs to scan, each treated like a `node_modules/`. Use for monorepos (`yarn workspaces`, `pnpm workspaces`) or local dev setups where framework packages live outside `node_modules/`. Packages found in scan paths override same-named entries in `node_modules/`.
- `--override` — replace user-authored destination folders (those without our `.agent-kit-managed` sentinel). Skipped with a warning by default.

This is the command to wire into your project's `postinstall`:

```json
{
  "scripts": {
    "postinstall": "agent-kit sync"
  }
}
```

## `agent-kit watch`

Watch `AGENTS.md`, the project's local `skills/**/SKILL.md`, and every `node_modules/**/skills/**/SKILL.md`; re-derive and re-sync on change. Intended for the active dev loop when editing skills locally and for monorepo / path-linked setups where `postinstall` does not re-fire.

```bash
npx agent-kit watch
npx agent-kit watch --path @warlock.js
```

Flags:

- `--cwd <path>` — working directory override.
- `--path <dirs>` / `-p` — extra dirs whose `**/skills/**/SKILL.md` should also be watched.
- `--override` — replace user-authored destination folders on each re-sync.

Behavior:

- Performs a full sync on startup so the working tree is consistent.
- Listens for `add`/`change`/`unlink` events on all four watch sets (`AGENTS.md`, local `skills/`, `node_modules/`, extra paths).
- Debounces re-syncs by 150ms.

## Programmatic API

```typescript
import {
  deriveAll,
  syncSkills,
  findProjectRoot,
  scanForSkillPackages,
  deriveSlugForSkill,
} from "@mongez/agent-kit";

const root = await findProjectRoot();
if (!root) throw new Error("No package.json found");

const derived = await deriveAll({ root, targets: ["claude"] });
const skills = await syncSkills({
  root,
  targets: ["claude", "cursor"],
  scanPaths: ["@warlock.js"],  // optional: extra scan roots beyond node_modules
  override: false,             // optional: replace user-authored dest folders
});

// skills.exported, skills.pruned, skills.skipped, skills.targets, skills.packages, skills.scannedPaths
```

## Exit behavior

- All commands exit 0 on success.
- `sync` exits non-zero if `AGENTS.md` is missing (the derive pass throws). `--skills-only` bypasses that pass and succeeds without it. `init` never errors on a missing source — it creates one.
- `watch` runs until the process is killed.
