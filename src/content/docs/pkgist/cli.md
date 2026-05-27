---
title: "Cli"
name: mongez-pkgist-cli
description: |
  pkgist CLI commands and flags: `build [pkg...]` (one or more standalone), `build:family <name>` (one synchronized family), `build:all` (every standalone + every family), `list` (show registered packages with current versions), `validate` (check config + paths). Common flags: `--dry-run`, `--no-publish`, `--no-git`, `--concurrency <n>`, `--config <path>`, `--verbose`.
  TRIGGER when: user runs or asks about `pkgist build`, `pkgist build:family`, `pkgist build:all`, `pkgist list`, `pkgist validate`; user asks about `--dry-run`, `--no-publish`, `--no-git`, `--concurrency`, `--config`, `--verbose` flags; user asks "how do I release just one package", "how do I dry-run", "what does pkgist list show"; user looking at pkgist help output.
  SKIP: per-package config options (use `package-options` skill); the build pipeline internals (use `pipeline` skill); git/publish behavior in depth (use `git-workflow` skill).
sidebar:
  order: 50
---

The `pkgist` binary auto-discovers a config file (`pkgist.config.ts` or `builder.ts`) in the current working directory unless `--config` is passed.

## Commands

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
| `--concurrency <n>` | Override `settings.concurrency`. Drop to 1 to serialize builds for debugging |
| `--config <path>` | Use a specific config file instead of auto-discovery. Path is relative to cwd |
| `--verbose` | Print debug-level log lines (every step, including ones normally silent on success) |

## Typical invocations

| Scenario | Command |
|---|---|
| Sanity-check config before any release | `pkgist validate` |
| Inventory current versions | `pkgist list` |
| Preview a release | `pkgist build:all --dry-run` |
| Real release of everything | `pkgist build:all` |
| Hot-fix one package | `pkgist build @scope/the-pkg` |
| Release a synchronized group | `pkgist build:family atom` |
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
