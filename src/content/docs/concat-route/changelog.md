---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

## Unreleased

### Fixed

- _(No public-API behavior changes in this pass — the function's output is identical to v1.0.0. Bugs noticed and left in place are tracked as skipped tests in `src/__tests__/concat-route.test.ts`; see the file:line comments inside.)_

### Added

- **README rewrite**. Marketing-style index with install, 30-second tour, full API surface, normalization rules, edge cases (query strings, hash fragments, absolute URLs), and links to sibling packages.
- **AI kit**. `llms.txt`, `llms-full.txt`, and `skills/` folder (`README`, `overview`, `concat-route`, `recipes`) for tool-assisted development.
- **Test suite**. Vitest tests covering empty input, root segments, falsy filtering, leading/trailing slash stripping, multi-slash collapse, embedded slashes, query strings, hash fragments, and known-quirk cases (skipped).
- **CI**. GitHub Actions workflow: Node 18/20/22 × Ubuntu, plus Node 20 × Windows.
- **Package metadata**. `keywords`, `sideEffects: false`, and `test`/`test:watch` scripts. `vitest` and `typescript` added as devDependencies.

### Changed

- _(None — the public API of `concatRoute` is unchanged.)_

### Removed

- _(None.)_

### Tests

```
<count emitted by `yarn test` — see CI for the canonical number>
```
