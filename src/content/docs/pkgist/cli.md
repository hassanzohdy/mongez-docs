---
title: "CLI"

name: mongez-pkgist-cli
description: |
  pkgist CLI commands and flags: `init` (scaffold pkgist.config.ts), `build [pkg...]` (standalone packages OR individual family members, for single-member recovery), `build:family <name>` (one synchronized family), `build:all` (every standalone + every family), `list` (show registered packages with current versions), `validate` (check config + paths). Common flags: `--dry-run`, `--no-publish`, `--no-git`, `--no-verify-publish` (skip the registry read-back), `--retries <n>` (attempts per network operation), `--bump <strategy>` (per-run version override), `--commit [message]` (per-run commit-message override), `--concurrency <n>`, `--config <path>`, `--verbose`. Exit codes: 0 only when every phase of every targeted package completed; 1 on any failed or unresolved phase, and on a run that matched no packages.
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

Build packages by name — standalone packages, or **individual family members**.

```sh
pkgist build @my-scope/utils
pkgist build @my-scope/utils @my-scope/cache @my-scope/events
pkgist build --all                    # all standalone (alias for `build:all` without families)
```

**Single-member recovery.** When one member of a family fails — a publish that timed out, a push that could not land — finish just that one instead of re-cutting the whole family:

```sh
pkgist build @warlock.js/cascade --bump 4.12.0
```

Pass the **exact version** with `--bump`. Without it, pkgist computes the version the family *would* bump to next and warns, because that is a new release rather than the completion of an existing one. The other members are not touched, and the final summary says the run was a single member of a family.

Re-running is safe: each step checks the remote first and skips what is already done, so a member that is already published and pushed reports as skipped rather than failing as a duplicate.

A name that matches nothing exits **1**. Before 1.6.0 this warned and exited 0, so a typo — or this very recovery command, which `build` used to reject — reported success having done nothing.

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
| `--no-verify-publish` | Skip the post-publish registry read-back. On by default; the run's last line discloses when it was skipped |
| `--retries <n>` | Attempts per network operation (push, tag push, publish), **including the first**. Default `3`. Non-network failures are never retried regardless |
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

- `0` — **every phase of every targeted package completed.** This is the only case that prints the word "successfully".
- `1` — at least one phase **failed** or could **not be determined**, or the run matched no packages at all.

An unresolved phase — the registry was unreachable, remote tags could not be read — is not a success. The run exits non-zero and the summary marks it `UNRESOLVED` rather than implying the package is fine.

Builds run in parallel, so a failure in one package doesn't stop the others.

## Reading the final summary

Every run ends with either a success line or a `Release problems` section naming each failure **by package and by phase**:

```
Release problems
  @warlock.js/cascade@4.12.0
    FAILED  npm publish     ETIMEDOUT (3 attempts)
  create-warlock@4.12.0
    FAILED  git push        Pushing to github.com:warlockjs/create-warlock.git
    ⚠ published to npm with its release commit NOT on the remote

build:family warlock: release INCOMPLETE — 24 completed, 2 FAILED of 26
```

Three rules govern that last line:

1. **It never says "successfully" unless nothing failed.** The word at the end carries the claim, and a run that ends in the same word as a clean one will be quoted as a clean one.
2. **A narrowed run says so in the line itself**, not a footnote — `--no-publish`, `--no-git`, `--no-verify-publish`, `--dry-run`, or targeting a subset all appear in brackets. A shortened run reporting the same words as a full one is how a partial verification gets cited as a complete one.
3. **A lockstep family that lost a member is reported as BROKEN**, not as "N of M succeeded". Members are pinned to each other at exact versions, so one missing member can make every other member uninstallable. The fraction invites the reader to think most of it landed; it didn't.

## `pkgist help`

```sh
pkgist --help
pkgist build --help
```

The CLI is built on commander — every command supports `--help` for its own flags.
