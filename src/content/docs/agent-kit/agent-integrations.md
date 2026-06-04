---
title: "Agent integrations"
name: mongez-agent-kit-agent-integrations
description: |
  Per-IDE setup walkthroughs for using @mongez/agent-kit with Claude Code, Cursor, Codex, Kiro, Gemini CLI, GitHub Copilot, Aider, and Antigravity. Each walkthrough shows the exact files agent-kit creates, the `--target` flag to pass, the reload quirks, and a copy-pasteable `package.json` snippet.
sidebar:
  order: 15
---

You're a **developer** who wants their AI coding agent to read the same project conventions as the rest of the team and pick up the skills bundled inside the npm packages you depend on. This page is the per-IDE cookbook. Pick your agent below, copy-paste the snippet, ship.

Every section follows the same three-step pattern — what differs is **which files agent-kit writes**, **which `--target` flag to pass**, and **what reload step the agent needs**.

## The shared baseline

Before any per-IDE step, every project does the same bootstrap — no install needed:

```sh
npx @mongez/agent-kit@latest init
```

That runs the latest published agent-kit on the fly (use the **scoped** name with `npx`; `npx agent-kit …` unscoped resolves a different package) and writes a starter `AGENTS.md` at the project root (only if one doesn't already exist), then derives `CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, and `CONVENTIONS.md` from it. (`init` is one-time, so always-latest `npx` is ideal; the recurring `sync` belongs as a pinned dev dependency.) From here, the per-agent sections below differ only in which `--target` you pass to `sync` and which directory the skills land in.

Once you've picked your target(s), wire `sync` into `postinstall` so every future `yarn install` / `npm install` keeps everything current:

```json
{
  "scripts": {
    "postinstall": "agent-kit sync"
  }
}
```

## Using agent-kit with Claude Code

**Claude Code** is Anthropic's terminal/IDE coding agent. It reads `CLAUDE.md` for project conventions and `.claude/skills/` for installable skills. **Live skill reload** — the only agent that picks up new skill files within the same session without a restart.

```sh
# One-time setup
npx agent-kit init
npx agent-kit sync --target claude
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["claude"] }
}
```

agent-kit creates: `CLAUDE.md` (derived from `AGENTS.md`) + `.claude/skills/<pkg-slug>-<skill-name>/SKILL.md` for every skill bundled in your dependencies.

**Reload quirk:** if `.claude/skills/` didn't exist when your Claude Code session started, restart Claude once after the first sync so it discovers the new directory. After that, edits to existing skill files are picked up on the next prompt — no restart.

## Using agent-kit with Cursor

**Cursor** is a VSCode-based AI editor. Reads root `AGENTS.md` natively (no derivation needed) and `.cursor/skills/` for skills.

```sh
npx agent-kit sync --target cursor
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["cursor"] }
}
```

agent-kit creates: `.cursor/skills/<pkg-slug>-<skill-name>/SKILL.md` for every bundled skill. **No `CLAUDE.md`-style derived file is generated** — Cursor reads `AGENTS.md` directly.

**Reload quirk:** Cursor reads its `.cursor/skills/` directory on session start. After running sync, close and reopen the project (or `Cmd/Ctrl+Shift+P` → "Reload Window") so the new skills are picked up.

## Using agent-kit with Codex

**Codex** is OpenAI's coding agent (CLI + IDE flavors). Reads root `AGENTS.md` natively and `.codex/skills/` for skills.

```sh
npx agent-kit sync --target codex
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["codex"] }
}
```

agent-kit creates: `.codex/skills/<pkg-slug>-<skill-name>/SKILL.md`. No derived AGENTS.md alternative needed.

**Reload quirk:** Codex picks up skills on the next session. CLI users get fresh reads on every `codex` invocation; IDE users should reload the window.

## Using agent-kit with Kiro

**Kiro** is Amazon's AI-native IDE. Reads root `AGENTS.md` natively and `.kiro/skills/` for skills.

```sh
npx agent-kit sync --target kiro
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["kiro"] }
}
```

agent-kit creates: `.kiro/skills/<pkg-slug>-<skill-name>/SKILL.md`. No derived file.

**Reload quirk:** Reload Kiro (window reload) after the first sync. Subsequent skill edits typically need a fresh session too.

## Using agent-kit with Gemini CLI

**Gemini CLI** is Google's terminal-based coding agent. Reads `.gemini/GEMINI.md` (it does **not** read root `AGENTS.md` natively).

```sh
npx agent-kit sync --derive-only
```

agent-kit creates: `.gemini/GEMINI.md` derived from `AGENTS.md` (regenerated on every sync, so the two never drift).

**No `--target gemini` for skills** — Gemini CLI doesn't currently have a published skills directory convention, so agent-kit doesn't write one. Only the derived `GEMINI.md` is generated for this agent. If you also use Claude or Cursor on the same project, run `sync --target claude,cursor` so the derive step + the skills targets you _do_ care about run in one shot:

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["claude", "cursor"] }
}
```

The Gemini derive runs on every sync regardless of `targets` — the `targets` array gates only the **skills** export. So this `agentKit` block keeps `GEMINI.md` fresh AND mirrors skills into Claude + Cursor.

**Reload quirk:** Gemini CLI re-reads its instructions on every invocation, so there's no "reload window" step.

## Using agent-kit with GitHub Copilot

**GitHub Copilot** is the VSCode / Visual Studio AI completion + chat agent. Reads `.github/copilot-instructions.md` for project conventions and `.github/skills/` for skills.

```sh
npx agent-kit sync --target copilot
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["copilot"] }
}
```

agent-kit creates: `.github/copilot-instructions.md` (derived from `AGENTS.md`) + `.github/skills/<pkg-slug>-<skill-name>/SKILL.md`.

**Reload quirk:** `Cmd/Ctrl+Shift+P` → "Developer: Reload Window" after the first sync so VSCode re-scans `.github/skills/`. Copilot's instructions file is re-read on every prompt, so no reload needed for AGENTS.md edits.

## Using agent-kit with Aider

**Aider** is a terminal-based AI pair programmer that doesn't follow the `skills/` convention. It reads a `CONVENTIONS.md` file (loaded via `/read` or auto-loaded via `.aider.conf.yml`).

```sh
npx agent-kit sync --derive-only
```

agent-kit creates: `CONVENTIONS.md` derived from `AGENTS.md`.

To auto-load it in every Aider session, drop this in `.aider.conf.yml` at the project root:

```yaml
read:
  - CONVENTIONS.md
```

**No `--target aider` for skills** — Aider doesn't currently have a skills directory convention. Only the derived `CONVENTIONS.md` is generated for this agent.

**Reload quirk:** Aider re-reads `CONVENTIONS.md` on every session start.

## Using agent-kit with Antigravity

**Antigravity** is Google's AI-native IDE (distinct from Gemini CLI). Reads root `AGENTS.md` natively and `.agent/skills/` (singular `agent` — not to be confused with Amp's plural `.agents/skills/`).

```sh
npx agent-kit sync --target antigravity
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["antigravity"] }
}
```

agent-kit creates: `.agent/skills/<pkg-slug>-<skill-name>/SKILL.md`. No derived file.

**Reload quirk:** Reload the Antigravity workspace after the first sync.

## Using more than one agent at once

You can pass multiple targets to a single `sync` invocation, and the `agentKit.targets` array in `package.json` accepts a list too. This is the **right answer** when a project has contributors using different agents — every supported agent picks up the same skills with one install.

```sh
npx agent-kit sync --target claude,cursor,codex
```

```json
{
  "scripts": { "postinstall": "agent-kit sync" },
  "agentKit": { "targets": ["claude", "cursor", "codex", "copilot"] }
}
```

Every listed target gets its own `.<tool>/skills/` directory. Skill content is copied (not symlinked) — disk overhead is small, but you can mix and match without worrying about cross-tool state. The derive step still emits `CLAUDE.md`, `.gemini/GEMINI.md`, `.github/copilot-instructions.md`, and `CONVENTIONS.md` on every sync regardless of which skill targets you pick.

## Where to go next

- **[Overview](../overview/)** — what agent-kit is and how it fits together
- **[CLI usage](../cli-usage/)** — every flag, every command, exact invocations
- **[Recipes](../recipes/)** — monorepo wiring, watch mode, CI guardrails, `pick`/`omit` filtering
- **[Authoring skills](../authoring-skills/)** — for **package authors** who want to ship reusable skills inside their own npm package
