---
title: "CLI usage"
name: mongez-agent-kit-cli-usage
description: |
  Exact commands, flags, and typical wiring for the `agent-kit` CLI (`init` / `sync` / `watch`) and its programmatic counterparts.
sidebar:
  order: 16
---

Three commands. All are idempotent — running them twice in a row is a no-op the second time.

## `agent-kit init`

Scaffold a starter `AGENTS.md` (only if it does not exist), derive the per-tool files from it, and seed `agentKit.targets` in `package.json`.

```bash
npx @mongez/agent-kit@latest init                 # no install — runs the latest published version
npx @mongez/agent-kit@latest init --target claude,cursor
```

> **Scoped name with `npx`.** Use `npx @mongez/agent-kit …` (scoped) when running without a local install — `npx agent-kit …` (unscoped) resolves a *different* package. The bare `agent-kit` binary only works once it's installed locally.

Flags:

- `--cwd <path>` — start from a different working directory (defaults to `process.cwd()`).
- `--target <names>` — comma-separated skill targets to write into `package.json`'s `agentKit.targets` (`claude`, `copilot`, `cursor`, `codex`, `opencode`, `amp`, `goose`, `kiro`, `antigravity`). Defaults to `claude`. Passing this **overwrites** an existing `agentKit.targets`; without it, an already-set value is left alone. Unknown names error out before anything is written.

### `init` vs `sync` — different delivery

- **`init`** is a one-time scaffold → `npx @mongez/agent-kit@latest init` is ideal (zero install, always latest).
- **`sync`** runs on every install and in CI → install agent-kit as a **pinned dev dependency** and call it from `postinstall`. Don't route the recurring sync through always-latest `npx` — a new agent-kit version could silently change generated output, breaking build reproducibility. Ad-hoc manual `npx @mongez/agent-kit@latest sync` is fine.

Behavior:

- If `AGENTS.md` exists → leave it alone.
- If `AGENTS.md` is missing → write a starter template.
- Always derives `CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`.
- Seeds `agentKit.targets` into `package.json`: writes `["claude"]` (the built-in default, made explicit so it's discoverable and editable) when no `agentKit.targets` exists; writes `--target`'s value when that flag is passed, overwriting any existing list. An existing `agentKit` block's other fields (`pick`, `omit`, …) and the file's indentation are preserved. Note `targets` only gates the *skills* export — `init` itself doesn't sync skills, so the seeded value first takes effect on the next `agent-kit sync`.
- Wires `"postinstall": "agent-kit sync"` into `package.json` — but only when it's safe: (1) `@mongez/agent-kit` is already a declared `dependency`/`devDependency` (so the bare `agent-kit` binary resolves at install time — the `npx @mongez/agent-kit@latest init` bootstrap installs nothing, so wiring a postinstall there would break the next install), and (2) no `postinstall` already exists (an existing one is never clobbered). When either gate blocks, `init` prints a hint instead of writing.

## `agent-kit sync`

Re-derive the per-tool files from `AGENTS.md` and export skills from installed packages.

```bash
npx agent-kit sync
npx agent-kit sync --target claude,cursor
npx agent-kit sync --derive-only
npx agent-kit sync --skills-only
npx agent-kit sync --path @warlock.js
npx agent-kit sync --projects backend,frontend
npx agent-kit sync --override
```

Flags:

- `--cwd <path>` — working directory override.
- `--target <names>` — comma-separated skill targets. Valid: `claude`, `copilot`, `cursor`, `codex`, `opencode`, `amp`, `goose`, `kiro`, `antigravity`. Defaults to `claude`.
- `--derive-only` — skip skills export.
- `--skills-only` — skip derivation.
- `--path <dirs>` / `-p` — comma-separated extra dirs to scan, each treated like a `node_modules/` (its **children** are packages). Use for folders of linked packages (`--path @warlock.js`). Packages found in scan paths override same-named entries in `node_modules/`.
- `--projects <dirs>` — comma-separated monorepo project dirs (or one-level globs like `apps/*`) to aggregate. Each is treated as **one project**: its own `skills/` (prefixed with the project dir name) plus its `node_modules/` deps (filtered by *that project's* `agentKit` config). Distinct from `--path`; defaults to `agentKit.monorepo.projects`. See the [Monorepos](../monorepos/) page.
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

Watch `AGENTS.md` and your editable skill source directories; re-derive and re-sync on change. Intended for the active dev loop when editing skills locally and for monorepo / path-linked setups where `postinstall` does not re-fire.

```bash
npx agent-kit watch
npx agent-kit watch --path @warlock.js
npx agent-kit watch --projects backend,frontend
```

Flags:

- `--cwd <path>` — working directory override.
- `--path <dirs>` / `-p` — extra package dirs (each treated like a `node_modules/`) whose `skills/` should also be watched.
- `--projects <dirs>` — monorepo project dirs (or one-level globs) to aggregate + watch. Defaults to `agentKit.monorepo.projects`.
- `--override` — replace user-authored destination folders on each re-sync.

Behavior:

- Performs a full sync on startup so the working tree is consistent.
- Resolves the **real** skill-source directories and watches those: `AGENTS.md`, the root `skills/`, each `--path` package's `skills/`, and each `--projects` project's `skills/` + `package.json` (so `pick`/`omit` edits re-sync too). Watching concrete dirs is deliberate — chokidar v4+ dropped glob support, so glob patterns would silently match nothing.
- Dependency skills under `node_modules/` are **not** watched — they change only on (re)install, which fires `postinstall` → `sync`.
- Listens for `add`/`change`/`unlink` and debounces re-syncs by 150ms.
- New top-level skill folders created mid-session are picked up on the next `watch` restart.

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
  scanPaths: ["@warlock.js"],     // optional: extra scan roots (children = packages)
  projects: ["backend", "frontend"], // optional: monorepo projects to aggregate
  override: false,                // optional: replace user-authored dest folders
});

// skills.exported, skills.pruned, skills.skipped, skills.targets,
// skills.packages, skills.scannedPaths, skills.projects
```

## Exit behavior

- All commands exit 0 on success.
- `sync` exits non-zero if `AGENTS.md` is missing (the derive pass throws). `--skills-only` bypasses that pass and succeeds without it. `init` never errors on a missing source — it creates one.
- `watch` runs until the process is killed.
