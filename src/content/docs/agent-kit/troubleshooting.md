---
title: "Troubleshooting"
name: mongez-agent-kit-troubleshooting
description: |
  Symptom → cause → fix for the common @mongez/agent-kit problems: `agent-kit: command not found`, unscoped `npx agent-kit` fetching the wrong package, skills synced but the agent doesn't see them, `agentKit.pick matched no installed packages`, two-package slug collision, `sync` errors on missing AGENTS.md, a published package's `skills/` invisible to consumers, `--target` typos, `watch` not re-firing on `node_modules` edits, and a hand-authored skill folder vanishing after `sync --override`.
sidebar:
  order: 50
---

Symptom → cause → fix. Find the line that matches what you hit.

> **Auto-trigger:** user reports any error/log line from `agent-kit init`, `agent-kit sync`, or `agent-kit watch`; user says "command not found", "skills not showing up", "wrong package", "pick matched no installed packages", "collision", "AGENTS.md missing", "my skill folder disappeared"; user asks "why doesn't X work" after running an agent-kit command.
>
> **Skip when:** the question is about how to *use* a feature (CLI usage, configuration, monorepos) rather than a malfunction.

## `agent-kit: command not found`

**Symptom.** `postinstall: agent-kit sync` runs but errors with `command not found`, or you typed `agent-kit sync` in a terminal and got the same.

**Cause.** The bare `agent-kit` binary only resolves when `@mongez/agent-kit` is installed locally (in the project's `node_modules/.bin`). The zero-install `npx @mongez/agent-kit@latest init` bootstrap installs nothing.

**Fix.** Install agent-kit as a dev dependency:

```sh
npm install -D @mongez/agent-kit
# or: yarn add -D @mongez/agent-kit / pnpm add -D @mongez/agent-kit
```

Now `postinstall: agent-kit sync` and any plain `agent-kit sync` invocation will resolve the local binary.

## `npx agent-kit …` is fetching the wrong package

**Symptom.** `npx agent-kit init` (or `sync`) downloads and runs something unrecognizable — different help text, unfamiliar flags.

**Cause.** Without the scope, `agent-kit` resolves to a different, unrelated npm package when nothing is installed locally. npm doesn't fall back to scoped names.

**Fix.** Use the **scoped** name when running without a local install:

```sh
npx @mongez/agent-kit@latest init
```

After installing agent-kit as a dev dep, the unscoped `npx agent-kit …` is fine — npx prefers the local binary in `node_modules/.bin`.

## Sync said it succeeded but my agent shows zero skills

**Symptom.** `.claude/skills/` (or `.cursor/skills/`, `.codex/skills/`, …) exists and contains the expected folders, but the agent UI shows no skills.

**Cause.** Every agent except **Claude Code** reads its skills directory **at session start**. If the directory didn't exist when you opened the IDE, the agent isn't watching it.

**Fix.** Reload the window once after the first sync:

- **Cursor / Antigravity / Kiro / Copilot / Amp** — `Cmd/Ctrl+Shift+P` → "Developer: Reload Window".
- **Codex / OpenCode / Goose** — restart the session / next CLI invocation.
- **Claude Code** — picks up edits to existing skills live; a *brand-new* `.claude/skills/` directory still needs one restart.

## `agentKit.pick matched no installed packages — no skills will be synced`

**Symptom.** Warning during `sync`; the skills export is empty even though installed packages do ship skills.

**Cause.** `pick` keys are matched **exactly** against installed package names. A typo, missing scope (`agent-kit` vs `@mongez/agent-kit`), or a name that isn't actually installed silently drops everything — `pick` is an allowlist.

**Fix.** Check the keys against your actual `node_modules`:

```sh
ls node_modules/@mongez   # or wherever your packages live
```

Update `agentKit.pick` to the exact scoped names. If you want everything except specific noise, switch to `omit`:

```json
{ "agentKit": { "omit": { "@some-vendor/sdk": true } } }
```

## Sync throws "two packages produced the same destination slug"

**Symptom.** `sync` errors with both package names and refuses to write anything.

**Cause.** agent-kit slugs every skill folder as `<pkg-slug>-<skill-path>` precisely so collisions are impossible — but two different packages *can* legitimately resolve to the same slug (extremely rare; usually a sign of suspiciously similar package names). agent-kit refuses to silently overwrite.

**Fix.** `omit` one of them, then report the case (with both names) so the upstream can rename its skill folder:

```json
{ "agentKit": { "omit": { "@offending/pkg": true } } }
```

## `sync` errors when `AGENTS.md` is missing

**Symptom.** `agent-kit sync` exits non-zero with an error pointing at `AGENTS.md`.

**Cause.** `sync` runs the derive pass first (unless `--skills-only` is passed), and derive needs `AGENTS.md` at the project root.

**Fix.** Run `init` once to scaffold a starter (it never clobbers an existing file):

```sh
npx @mongez/agent-kit@latest init
```

Or skip the derive pass when you only want the skills export:

```sh
npx agent-kit sync --skills-only
```

## My package ships skills but consumers don't see them

**Symptom.** You added `skills/<name>/SKILL.md` to your published npm package, published a new version, but downstream `agent-kit sync` finds nothing from your package.

**Cause.** `npm publish` only ships paths listed in the `files` field of `package.json` (or paths not blocked by `.npmignore`). A package with `"files": ["dist"]` silently excludes `skills/`.

**Fix.** Add `skills` to `files` and cut a patch release:

```json
{ "files": ["dist", "skills", "README.md", "LICENSE"] }
```

The next `npm install` on the consumer side will bring the bundled `skills/` along, and the next `sync` will mirror them.

## `--target` errors with "Unknown skill target(s)"

**Symptom.** `agent-kit init --target claude,corsor` (or the same flag on `sync`) errors immediately.

**Cause.** Both commands validate target names against a fixed list: `claude`, `copilot`, `cursor`, `codex`, `opencode`, `amp`, `goose`, `kiro`, `antigravity`. `init` validates **before** mutating `package.json` — a typo never persists.

**Fix.** Check spelling against the list above and rerun. No file was touched.

## `watch` doesn't re-fire when I edit a skill inside `node_modules/`

**Symptom.** You `npm link`'d a package or edited a file directly under `node_modules/@scope/pkg/skills/foo/SKILL.md`, and `agent-kit watch` isn't re-syncing.

**Cause.** Watch deliberately ignores `node_modules/**` — dependency skills only change on (re)install, which fires `postinstall → sync`. The watched paths are `AGENTS.md`, the root `skills/`, each `--path` package's `skills/`, and each `--projects` project's `skills/` + `package.json`.

**Fix.** Point `--path` at the parent directory of the linked packages, so watch treats them as first-class sources (and they win on dedupe over same-named entries in `node_modules/`):

```sh
npx agent-kit watch --path ../linked-packages
```

## My hand-authored skill folder disappeared after `sync`

**Symptom.** You created `.claude/skills/my-custom/` by hand, ran `sync`, and your folder is gone.

**Cause.** Sync only prunes folders containing the `.agent-kit-managed` sentinel file — your hand-authored folder should have been left alone. If it vanished, the most likely cause is `--override`, which explicitly *replaces* hand-authored destinations.

**Fix.** Drop `--override` from the invocation. Without it, hand-authored destinations are **skipped with a warning**, not replaced. Restore the folder from git history; future syncs without `--override` will leave it untouched.

## Where to go next

- **[CLI usage](../cli-usage/)** — every flag and exact exit behavior
- **[Configuration](../configuration/)** — the `agentKit` block (`targets`, `pick`, `omit`, `monorepo.projects`)
- **[Agent integrations](../agent-integrations/)** — per-IDE walkthroughs (Claude Code, Cursor, Codex, Kiro, Copilot, Antigravity, OpenCode, Amp, Goose, Gemini CLI, Aider)
