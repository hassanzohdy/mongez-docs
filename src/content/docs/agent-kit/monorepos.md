---
title: "Monorepos"
name: mongez-agent-kit-monorepos
description: |
  Using `@mongez/agent-kit` in a monorepo / full-stack repo where one session at the root must see skills from sibling projects (backend, frontend, …). Covers `--projects` / `agentKit.monorepo.projects` aggregation, the difference from `--path`, per-project `node_modules` + per-project `agentKit` config, project-dir-prefixed authored skills, shared-dependency dedupe, the root `omit` global veto, per-workspace `AGENTS.md`, and watch mode across projects.
sidebar:
  order: 18
---

Claude Code (and every other agent) discovers project skills only from the **session-root** skills directory — it does **not** recurse into subdirectories. So in a full-stack repo opened at the root, an inner project's `backend/.claude/skills/` (or `backend/skills/`) is invisible. `agent-kit` closes that gap by **aggregating** each project's skills up into the root.

```
repo/                          ← you open your agent here; one .claude/skills/
├── package.json               ← agentKit.monorepo.projects: ["backend", "frontend"]
├── AGENTS.md
├── backend/
│   ├── package.json           ← backend's own agentKit.pick/omit
│   ├── skills/code-standards/SKILL.md
│   └── node_modules/@warlock.js/core/skills/…
└── frontend/
    ├── package.json
    ├── skills/forms/SKILL.md
    └── node_modules/@warlock.js/core/skills/…
```

```sh
npx agent-kit sync --projects backend,frontend
```

```
.claude/skills/
  backend-code-standards/        # backend's authored skill — prefixed with the project dir
  frontend-forms/                # frontend's authored skill
  warlock-js-core-use-cache/     # shared dependency — ONE copy, by package slug
```

## The mental model

> Each declared project is scanned **as if you ran `agent-kit sync` inside it** — its `node_modules/` dependency skills (filtered by *that project's own* `agentKit` config) **plus** its authored `skills/` folder — and the results are merged up into the root's skill directories.

## Declaring projects

Two equivalent ways. Pin it in config so contributors don't retype it:

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "monorepo": { "projects": ["backend", "frontend"] } }
}
```

…or pass it ad-hoc on the CLI (overrides the config):

```sh
npx agent-kit sync --projects backend,frontend
npx agent-kit sync --projects "apps/*"        # one-level glob: every dir under apps/
```

Entries are paths relative to the repo root (or absolute). A one-level glob (`apps/*`, `packages/*`, or bare `*`) expands to each immediate subdirectory; hidden dirs and `node_modules` are skipped. Multi-level / mid-path globs are intentionally unsupported.

## `--projects` vs `--path` — they are different

Both pull skills from outside the root's own `node_modules/`, but they treat the directory differently:

| Flag | Treats the dir as… | Use for |
|---|---|---|
| `--path X` | a `node_modules/` — **X's children are packages** | a folder of linked packages (`--path @warlock.js`) |
| `--projects X` | **one project** — scan *its* `skills/` + *its* `node_modules/` | a full-stack sibling project (`--projects backend`) |

`--path backend` would scan `backend`'s *children* as packages (and miss `backend/skills/` and `backend/node_modules/`). `--projects backend` is what you want for an actual project. They compose — you can pass both.

## Authored skills are prefixed by the project directory

A project's own `skills/` are exported with the **project directory name** as the slug prefix:

- `backend/skills/code-standards` → `backend-code-standards`
- `frontend/skills/code-standards` → `frontend-code-standards`

So two projects can ship a same-named skill without colliding. (Dependency skills keep their package-name slug, e.g. `warlock-js-core-use-cache`, and dedupe across projects.)

## Per-project config is honored

Each project's `node_modules/` skills are filtered by **that project's own** `agentKit.pick`/`omit` from its `package.json`. So `backend` can omit a noisy SDK that `frontend` doesn't even depend on:

```json
// backend/package.json
{ "agentKit": { "omit": { "@some/noisy-sdk": true } } }
```

A project's own authored `skills/` are **always** included — `pick` (a dependency allowlist) never drops them.

## Precedence rules

- **Shared dependency → one copy (union).** If `backend` and `frontend` both depend on `@warlock.js/core`, its skills are exported once; the kept set is the *union* across projects (a skill survives if any project kept it). One copy keeps Claude's skill list clean and avoids near-duplicate routing noise.
- **Root `omit` is the global veto.** After aggregation, the root `package.json`'s `omit` applies across everything — the root can ban a dependency repo-wide regardless of what a project kept.
- **A project's `targets`/`monorepo` are ignored.** Only its `pick`/`omit` matter, and aggregation never recurses into a project's own `monorepo.projects`.

## Per-workspace `AGENTS.md`

Aggregation handles **skills**. For per-project **instruction files** (a `CLAUDE.md` tuned to each workspace), run the derive step inside each workspace — each gets its own `AGENTS.md` → `CLAUDE.md`:

```sh
npx agent-kit sync --cwd backend
npx agent-kit sync --cwd frontend
```

Editors open the closest `*.md` to the file being edited, so contributors in `backend/` get backend's conventions automatically.

## Watch mode across projects

```sh
npx agent-kit watch --projects backend,frontend
```

Watch resolves the real skill-source directories up front and watches them: `AGENTS.md`, the root `skills/`, each project's `skills/`, and each project's `package.json` (so a `pick`/`omit` edit re-syncs too). Dependency skills under `node_modules/` are **not** watched — they only change on (re)install, which fires `postinstall` → `sync`.

## How big a monorepo?

This is built for full-stack repos — a handful of sibling projects (backend, frontend, mobile, admin), not hundreds. Each project's full `node_modules/` is scanned (in parallel), so a few projects is cheap; pointing it at dozens of workspaces will multiply the per-sync scan cost.
