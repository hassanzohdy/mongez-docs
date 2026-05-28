---
title: "Authoring skills"
name: mongez-agent-kit-authoring-skills
description: |
  How to ship reusable skills from an npm package so consumers using `agent-kit sync` pick them up automatically — folder layout, `SKILL.md` frontmatter (`description`, `when_to_use`, `name`), the `files` field, flat destination naming, and the front-door / subskill convention.
sidebar:
  order: 18
---

If you maintain a library that benefits from a coding-agent skill (a model registration pattern, a CLI command shape, a domain-specific convention), you can ship that skill with your package. Anyone using `agent-kit sync` in a downstream project will receive your skill in their `.claude/skills/`, `.cursor/skills/`, etc.

## Folder layout

Place your skill folders inside your package, conventionally under `skills/`. Each skill is a directory containing a `SKILL.md` (plus any supporting files).

```
my-package/
├── package.json
├── src/
└── skills/
    ├── using-the-thing/
    │   ├── SKILL.md
    │   └── examples/
    │       └── example.ts
    └── another-skill/
        └── SKILL.md
```

### Nested organization (for larger skill sets)

You can group skills under category folders — `agent-kit` walks `skills/` recursively, so any directory containing a `SKILL.md` becomes a skill, no matter how deep:

```
my-app/
└── skills/
    ├── backend/
    │   ├── auth/SKILL.md           ← skill, name "backend/auth"
    │   └── db/SKILL.md             ← skill, name "backend/db"
    ├── frontend/
    │   └── page-builder/SKILL.md   ← skill, name "frontend/page-builder"
    └── shared-utility/SKILL.md     ← skill, name "shared-utility" (flat OK too)
```

A directory containing `SKILL.md` is treated as a **leaf** — we don't recurse into it. So `skills/backend/SKILL.md` plus `skills/backend/auth/SKILL.md` would yield only `backend` (with `auth/` treated as supporting content). This matches the warlock-style "root + subskills" convention used in `@warlock.js/ai`, `@warlock.js/scheduler`, etc.

## No declaration needed — `skills/` is discovered automatically

You don't need to add anything to your `package.json`. As long as your package ships a `skills/` folder, `agent-kit sync` will find it via auto-discovery on the consumer's side. The folder layout above is the contract.

## What gets shipped

Make sure your package's `files` field (or absent `.npmignore`) includes the `skills/` directory:

```json
{
  "files": ["dist", "skills", "README.md"]
}
```

Without this, `npm publish` may omit the skills folder and downstream `agent-kit sync` will find nothing.

## Where the consumer sees it

Claude Code only discovers skills at the top level of `.claude/skills/` (no nested folders). `agent-kit` therefore exports every skill with a **flat folder name** derived from your package name and the skill's source folder path:

```
.claude/skills/
  my-org-my-package-using-the-thing/
    SKILL.md
    examples/
      example.ts
    .agent-kit-managed       ← sentinel, do not commit edits to this
  my-org-my-package-another-skill/
    SKILL.md
    .agent-kit-managed
```

### Folder name = identity

`agent-kit` derives the destination folder name automatically:

- **Single-skill packages** (root `skills/SKILL.md`): `<pkg-slug>` — e.g. `@warlock.js/ai` → `warlock-js-ai`
- **Multi-skill packages** (subdir layout): `<pkg-slug>-<skill-folder-path>` — e.g. `@my-org/pkg/skills/using-the-thing` → `my-org-pkg-using-the-thing`
- **Nested skills** (path under skills/): the path joins with `-` — e.g. `skills/backend/auth` → `<pkg-slug>-backend-auth`

The slug strips the leading `@`, replaces `/` and `.` with `-`, and lowercases. So you don't pick a globally-unique name — agent-kit guarantees uniqueness by prefixing with your package name.

### SKILL.md `name:` is optional display polish

The Claude Code Skills docs explicitly state: *"name — Display name for the skill. If omitted, uses the directory name."* So you have two choices:

- **Omit `name:` from frontmatter** — Claude uses the folder name (the auto-derived slug). Simplest, recommended.
- **Set `name:` to a custom display label** — e.g. `name: Using the thing` for a prettier label in Claude's UI. Routing still happens by folder name; this is purely cosmetic.

`agent-kit` **never reads or modifies** the SKILL.md content during sync. Your source file is copied verbatim into the destination folder.

## Writing a good SKILL.md

A `SKILL.md` is a markdown file with optional frontmatter:

```markdown
---
name: using-the-thing
description: One sentence telling an agent what this skill is about.
---

# Using the thing

## How to use

Concrete steps, with code examples where it helps.

## Pitfalls

Common mistakes and how to avoid them.
```

### Front-door skill convention

When your package ships **multiple skills** (Pattern B with several subdirs), include one "front-door" skill whose `when_to_use` is the broadest — typically "user imports from this package" — and which **orients the agent to what's available** plus points at the deeper skills. This becomes the entry point; subskills handle specific tasks.

The naming is up to you (`<pkg>-overview`, `<pkg>-conventions`, `<pkg>-fundamentals` all work). What matters is the role: one skill answering "what is this package, and what are the other skills inside it for?"

For Pattern A packages (single root `skills/SKILL.md`), the root file IS the front door — same convention, simpler structure.

The `description` field is the most important line for discovery — it determines whether an agent surfaces the skill at all. The `when_to_use` field is the most important line for noise control. Get both right.

## Don't ship runtime concerns as skills

Skills are documentation read by agents — not code that runs in your library. Don't bundle source code as "skills" thinking they will execute. If you need shared code, ship it as a regular module export.
