---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[1.1.4]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Added (5)</span></summary>

### Added

- **README rewrite**. Marketing-style index with install, 30-second tour, full API surface, normalization rules, edge cases (query strings, hash fragments, absolute URLs), and links to sibling packages.
- **AI kit**. `llms.txt`, `llms-full.txt`, and `skills/` folder (`README`, `overview`, `concat-route`, `recipes`) for tool-assisted development.
- **Test suite**. Vitest tests covering empty input, root segments, falsy filtering, leading/trailing slash stripping, multi-slash collapse, embedded slashes, query strings, hash fragments, and known-quirk cases (skipped).
- **CI**. GitHub Actions workflow: Node 18/20/22 × Ubuntu, plus Node 20 × Windows.
- **Package metadata**. `keywords`, `sideEffects: false`, and `test`/`test:watch` scripts. `vitest` and `typescript` added as devDependencies.

### Tests

```
<count emitted by `yarn test` — see CI for the canonical number>
```

</details>
