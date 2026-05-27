---
title: "Pkgist"
name: mongez-pkgist-overview
description: |
  @mongez/pkgist — a build, version, and publish tool for TypeScript/React npm packages. Powered by tsdown (Rolldown/Rust-based bundler). Supports standalone packages (independent versioning) and families (synchronized versioning), dual ESM+CJS output, file cloning, source snapshots, git tag+push automation, and dry-run mode.
  TRIGGER when: user installs, imports, or asks about `@mongez/pkgist`; user mentions `pkgist` CLI; user runs `pkgist build`, `pkgist build:family`, `pkgist build:all`, `pkgist list`, `pkgist validate`; user asks "how do I release my packages", "how do I build TypeScript packages with ESM+CJS", "what tool builds @mongez packages"; user is editing `pkgist.config.ts` or `builder.ts`; questions about monorepo release tooling for TS packages.
  SKIP: questions about other release tools (lerna, changesets, semantic-release, release-please); questions about the underlying bundler `tsdown` specifically (use tsdown docs); operational playbook for releasing the @mongez monorepo (use `releasing-mongez-monorepo` skill instead).
sidebar:
  order: 10
  label: "Overview"
---

A build, version, and publish tool for TypeScript/React npm packages. Powered by [tsdown](https://tsdown.dev) (Rolldown/Rust-based bundler).

## What it does

For each registered package, pkgist:

1. Reads the source `package.json` and resolves the next version (auto-patch by default).
2. Compiles `src/` with tsdown into `esm/` + `cjs/` + `.d.ts` files.
3. Clones whitelisted assets (README, LICENSE, skills, llms.txt, etc.) into the build.
4. Writes a clean `package.json` for the build (no devDeps, no scripts).
5. Updates the source `package.json` version in place.
6. Commits, tags `v<version>`, and pushes (when `commit` is set).
7. Publishes to npm with the configured access.

The full pipeline runs per-package in parallel up to the configured concurrency.

## Install

```sh
# npm  (dev dep, recommended)
npm install -D @mongez/pkgist

# yarn
yarn add -D @mongez/pkgist

# pnpm
pnpm add -D @mongez/pkgist
```

Prefer the dev-dep install — it pins the version per repo. The global install (`npm install -g @mongez/pkgist` etc.) is also supported when you want a single CLI binary across all your projects.

Add convenience scripts:

```json
{
  "scripts": {
    "release":     "pkgist build:all",
    "release:dry": "pkgist build:all --dry-run"
  }
}
```

## Quick example

Once a `pkgist.config.ts` exists (see the minimum config below), the release flow is two commands — dry-run first to inspect, then real build:

```sh
# Inspect every step (snapshot, compile, clone, commit, publish) without touching disk / git / npm
npx pkgist build:all --dry-run

# Real run: bumps versions, commits + tags + pushes per repo, publishes to npm
npx pkgist build:all

# Target one package
npx pkgist build @my-scope/utils

# Target a synchronized family (all family members share the new version)
npx pkgist build:family core
```

## Minimum viable config

Create `pkgist.config.ts` (or `builder.ts`) at the project root:

```ts
import { defineConfig } from "@mongez/pkgist";

export default defineConfig({
  settings: {
    buildDir: "../builds",
  },
  standalone: [
    {
      name: "@my-scope/utils",
      root: "../utils",
    },
  ],
});
```

That's the floor. From there:

- Add `commit: true` to enable auto-tagged git commits with `Released <version>` messages.
- Add `clone: ["README.md", "LICENSE"]` to ship docs.
- Add `version: "minor"` to bump beyond patch.
- Group related packages into `families[]` to share a version.

## When to reach for pkgist

| Situation | Use pkgist? |
|---|---|
| Solo TypeScript package, want ESM+CJS output | ✅ |
| Monorepo of TypeScript packages, want one tool to release all | ✅ |
| Need synchronized versioning across a group of related packages | ✅ (families) |
| Want git tag + npm publish + version bump in one step | ✅ |
| Need changelog generation | ❌ pair with conventional-changelog or release-please |
| Need semantic-release-style commit-message-driven versioning | ❌ pkgist is explicit-version-strategy, not commit-driven |
| Only need npm publish (no build, no git) | ❌ overkill — use `npm publish` directly |

## Further reading

- `configuration` skill — full config shape, `defineConfig`, `settings`
- `package-options` skill — every per-package field
- `cli` skill — every command + flag
- `pipeline` skill — what happens step-by-step per package
- `versioning` skill — auto/patch/minor/major + family rules
- `git-workflow` skill — commit shapes (string / true / false), tagging, push
- `recipes` skill — common patterns ready to copy
