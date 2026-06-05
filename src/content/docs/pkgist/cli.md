---
title: "CLI"

name: mongez-pkgist-cli
description: |
  pkgist CLI commands and flags: `init` (scaffold pkgist.config.ts), `build [pkg...]` (one or more standalone), `build:family <name>` (one synchronized family), `build:all` (every standalone + every family), `list` (show registered packages with current versions), `validate` (check config + paths). Common flags: `--dry-run`, `--no-publish`, `--no-git`, `--bump <strategy>` (per-run version override), `--commit [message]` (per-run commit-message override), `--concurrency <n>`, `--config <path>`, `--verbose`.
sidebar:
  order: 50
---

# CLI reference

The `pkgist` binary auto-discovers **`pkgist.config.ts`** (then `pkgist.config.js`) in the current working directory unless `--config` is passed. Run `pkgist init` to scaffold one — see the `configuration` skill for the discovery rule.

## Commands

### `init`

Scaffold a `pkgist.config.ts` in the current directory.

```sh
pkgist init
pkgist init --force        # overwrite an existing config
```

Writes a starter config (`buildDir: "./builds"`, `sourcesDir: "./sources"`, one example standalone package). If a `pkgist.config.ts` / `pkgist.config.js` already exists it does nothing and exits `0` — unless `--force` is passed. This is the fastest way to go from `npm install` to a working config.

### `build [pkg...]`

Build one or more standalone packages by name.

```sh
pkgist build @my-scope/utils
pkgist build @my-scope/utils @my-scope/cache @my-scope/events
pkgist build --all                    # all standalone (alias for `build:all` without families)
```

Family packages can't be targeted with `build` — use `build:family` for those.

### `build:family <name>`

Build every package in a family with a single shared version.

```sh
pkgist build:family atom
pkgist build:family localization
```

The `<name>` matches the `name` field on the family object. If you don't remember the family names, run `pkgist list` to see them.

### `build:all`

Build every standalone package and every family registered in the config.

```sh
pkgist build:all
```

Use for fleet-wide releases (LICENSE additions, dep updates, etc.). For incremental releases, prefer targeted `build` / `build:family` to avoid no-op version bumps on unchanged packages.

### `list`

Show every registered package and family with current version + type + format info.

```sh
pkgist list
```

Output:
```
=== Standalone Packages ===
  @my-scope/utils v2.1.0 [typescript] [esm, cjs]
    root: /path/to/utils
  @my-scope/cache v1.3.0 [typescript] [esm, cjs]
    root: /path/to/cache

=== Families ===
  Family: state
    @my-scope/atom       v6.0.7 [typescript] [esm, cjs]
    @my-scope/react-atom v6.0.7 [react]      [esm, cjs]
```

Use it for quick sanity checks — "what versions are currently on disk" before kicking off a release.

### `validate`

Verify the config parses correctly and every `root` path exists on disk.

```sh
pkgist validate
```

Catches typos in package roots, missing directories, malformed config. Cheap to run as a pre-commit hook or CI step.

## Common flags

Available on every `build*` command:

| Flag | Description |
|---|---|
| `--dry-run` | Print every step (snapshot, compile, clone, git, npm publish) without writing to disk, git, or npm. **Always run this before a real release** to verify versions, commit messages, and clone lists |
| `--no-publish` | Run everything except `npm publish`. Useful when you want to build + commit locally but defer publish |
| `--no-git` | Skip git add/commit/push/tag entirely, regardless of per-package `commit` |
| `--bump <strategy>` | Override the configured `version` for this run only: `patch` / `minor` / `major` / `auto` / an explicit `x.y.z`. Never edits the config file. See [Per-run overrides](#per-run-overrides) |
| `--commit [message]` | Override the configured `commit` for this run only: a message string, or a bare `--commit` to auto-generate `Released <version>`. See [Per-run overrides](#per-run-overrides) |
| `--concurrency <n>` | Override `settings.concurrency`. Drop to 1 to serialize builds for debugging |
| `--config <path>` | Use a specific config file instead of auto-discovery. Path is relative to cwd |
| `--verbose` | Print debug-level log lines (every step, including ones normally silent on success) |

## Per-run overrides

`--bump` and `--commit` override the per-package (or family) **`version`** and **`commit`** config fields for a single invocation — **without editing `pkgist.config.ts`**. Everything else (roots, clone lists, formats, types) stays in the config; the two values that change every release move to the command line.

```sh
# Patch-bump @scope/utils with an explicit message — config untouched
pkgist build @scope/utils --bump patch --commit "fix: guard against empty input"

# Minor-bump a whole family with an auto "Released <version>" message
pkgist build:family atom --bump minor --commit

# Fleet release at an explicit version, custom message, for every package
pkgist build:all --bump 3.0.0 --commit "chore: bump all to 3.0.0"
```

- **`--bump <strategy>`** takes the same five values as the config `version` field (`auto` / `patch` / `minor` / `major` / an explicit semver) — see the `versioning` skill. It applies to **every** targeted package, and for a family it overrides the single shared version.
- **`--commit [message]`** maps onto the `commit` field's shapes: a string is used verbatim; a **bare `--commit`** auto-generates `Released <new-version>`. To **skip** git instead, use `--no-git` (which always wins). See the `git-workflow` skill.
- **Precedence:** the CLI flag beats the config value; when a flag is omitted, the config value (or its default) is used unchanged.
- **Why this exists:** the config file holds only the static package registry, so running several releases in parallel never means two processes editing — and clobbering — the same `version` / `commit` lines.
- **Naming:** the version flag is `--bump`, not `--version`, because commander reserves `--version` for the root `pkgist --version` printer.

## Typical invocations

| Scenario | Command |
|---|---|
| Sanity-check config before any release | `pkgist validate` |
| Inventory current versions | `pkgist list` |
| Preview a release | `pkgist build:all --dry-run` |
| Real release of everything | `pkgist build:all` |
| Hot-fix one package | `pkgist build @scope/the-pkg` |
| Hot-fix with version + message from the CLI (no config edit) | `pkgist build @scope/the-pkg --bump patch --commit "fix: ..."` |
| Release a synchronized group | `pkgist build:family atom` |
| Release a family at an explicit version, auto message | `pkgist build:family atom --bump 6.1.0 --commit` |
| Build to verify, but don't ship | `pkgist build:all --no-publish --no-git` |
| Debug a failing build | `pkgist build @scope/the-pkg --verbose --concurrency 1` |

## Exit codes

- `0` — all targeted builds succeeded (including publishes if not `--no-publish`)
- non-zero — at least one package failed; the failing package(s) are logged with their wrapped error

Builds run in parallel, so a failure in one package doesn't stop others. The final summary shows the count.

## `pkgist help`

```sh
pkgist --help
pkgist build --help
```

The CLI is built on commander — every command supports `--help` for its own flags.
