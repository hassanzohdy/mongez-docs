---
title: "Git Workflow"
name: mongez-pkgist-git-workflow
description: |
  pkgist git automation: `commit` field accepts `string` (explicit message), `true` (auto-generates `Released <new-version>`, added in 1.1.0), `false` (explicit skip), or omitted (skip, back-compat default). When git runs, pipeline is `git add . → git commit → git push → git tag v<version> → git push tags`. Family-level `commit` overrides per-package commit. Optional `branch` field overrides the push target.
  TRIGGER when: user asks about pkgist's git automation; user sets or asks about `commit: true`, `commit: false`, `commit: "message"`, `branch`; user asks "how do I auto-generate release commit messages", "how do I skip git in pkgist", "what does pkgist tag look like", "does pkgist push tags"; user is debugging why git ops did/didn't run after a build; questions about `--no-git` flag.
  SKIP: npm publish (use `pipeline` skill section on publish, or `cli` skill for `--no-publish`); version-bump rules (use `versioning` skill); CLI commands in general (use `cli` skill).
sidebar:
  order: 50
---

pkgist optionally commits, tags, and pushes after each successful build. Whether git runs at all is controlled by the `commit` field.

## The four commit shapes

| Value | Behaviour |
|---|---|
| `"explicit message"` (string) | Use that exact message |
| `true` (boolean) | Auto-generate `Released <new-version>` (added in pkgist 1.1.0) |
| `false` (boolean) | Explicitly skip git for this package |
| omitted (`undefined`) | Skip git (back-compat default) |

`false` and omitted are functionally identical. Use `false` when you want the intent to be obvious in the config diff.

```ts
// Explicit per-release message — most informative
{ name: "@scope/utils", root: "../utils", commit: "fix: prevent overflow on large arrays" }

// Hands-off auto-message — set once, never updates
{ name: "@scope/utils", root: "../utils", commit: true }
// → commits "Released 2.1.1", tags v2.1.1

// Build-only, no git side effects (for local testing)
{ name: "@scope/utils", root: "../utils" }
// or explicitly:
{ name: "@scope/utils", root: "../utils", commit: false }
```

## What "git runs" actually means

When `commit` resolves to a non-empty message, pkgist runs this sequence in the package's `root` directory:

```
1. git add .
2. git commit -m "<message>"
3. git push origin <branch>
4. git tag v<new-version>
5. git push origin v<new-version>
```

The branch comes from `pkg.branch` if set, otherwise from `git rev-parse --abbrev-ref HEAD` in the package root.

**The `git add .` adds everything currently dirty in the working tree** — not just the version-bumped `package.json`. If your working tree has unrelated work-in-progress, that gets bundled into the release commit. Clean the tree (or stash unrelated changes) before the build to keep release commits focused.

## Family-level commit override

When a family declares `commit`, every member uses it — overriding any per-package `commit`. The shape is the same as per-package commit (`string | true | false | undefined`).

```ts
// One explicit message for every member
families: [
  {
    name: "atom-family",
    commit: "feat: improved subscribe contract",
    packages: [
      { name: "@scope/atom",       root: "../atom" },
      { name: "@scope/react-atom", root: "../react-atom", type: "react" },
    ],
  },
]

// Auto-generated for every member, with the shared family version
families: [
  {
    name: "atom-family",
    commit: true,
    packages: [ /* ... */ ],
  },
]
// → atom commits "Released 6.0.5", react-atom commits "Released 6.0.5"
```

Per-package `commit` on a family member is **ignored** when the family has `commit` set. Set per-package commit only when the family commit is unset and you want member-specific messages (rare — usually you want unified release commits).

## Tagging

Tags follow the pattern `v<new-version>` — e.g. `v2.1.1`, `v6.0.0-beta.1`. They are created locally and pushed to the remote in the same step.

If a tag already exists for that version on the remote, the `git push --tags` step will fail loudly. Reasons this happens:
- Re-running a build for a version that was already released → bump the version first
- Concurrent releases racing → check the remote state with `git fetch --tags` before retrying

## Branch handling

By default pkgist pushes to whatever branch is currently checked out in the package's `root`. Override with `branch`:

```ts
{ name: "@scope/utils", root: "../utils", commit: true, branch: "main" }
```

Use this when:
- The package has multiple long-lived branches and you only release from one
- You want a clear assertion in config that releases go to `main` specifically (defends against accidentally releasing from a feature branch)

## Skipping git for local test builds

Three equivalent ways to disable git for a single package:

```ts
{ name: "@scope/test", root: "../test" }              // omitted
{ name: "@scope/test", root: "../test", commit: false } // explicit
{ name: "@scope/test", root: "../test", commit: "" }   // empty string also skips
```

Or skip git for the whole run regardless of config: `pkgist build:all --no-git`.

## When `commit` resolves but `--no-git` is passed

`--no-git` always wins. The `commit` field is ignored for that invocation. Use this to do a "release everything to npm but don't touch git" pass — rare, but useful for hotfixes on packages where you can't push to git for some reason.
