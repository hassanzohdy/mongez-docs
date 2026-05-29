---
title: "Versioning"

name: mongez-pkgist-versioning
description: |
  Version-bump strategies for pkgist packages: `"auto"` / `"patch"` (default, bumps patch digit), `"minor"`, `"major"`, or any literal semver string. Standalone packages bump from their own current version. Families take the highest current version across all members and bump that, landing all members on the same new version.
sidebar:
  order: 50
---

# Versioning

pkgist computes the next version per package from a strategy you pick, then writes it back to the source `package.json` before building.

## The five strategies

| Strategy | What it does |
|---|---|
| `"auto"` (default) | Bump the patch digit. `2.1.0` → `2.1.1` |
| `"patch"` | Identical to `"auto"`. Bump the patch digit |
| `"minor"` | Bump minor, reset patch. `2.1.0` → `2.2.0` |
| `"major"` | Bump major, reset minor + patch. `2.1.0` → `3.0.0` |
| Literal semver string | Use exactly this version. `version: "3.0.0"` → `3.0.0` |

Pre-release versions follow the same rules (semver-internal):
- `"patch"` on `2.1.0-beta.1` → `2.1.0` (drops pre-release)
- An explicit `"2.1.0-beta.2"` is also valid

## Standalone packages

```ts
{ name: "@scope/utils", root: "../utils", version: "auto" }
// current: 2.1.0  →  next: 2.1.1

{ name: "@scope/utils", root: "../utils", version: "minor" }
// current: 2.1.0  →  next: 2.2.0

{ name: "@scope/utils", root: "../utils", version: "3.0.0" }
// any current     →  next: 3.0.0
```

## Family packages

Families synchronize. The family picks the **highest current version** across all members, then bumps it. All members land on the same new version.

```ts
// Members' current versions on disk:
//   atom          = 1.0.5
//   react-atom    = 5.1.3   ← highest
//   atomic-query  = 0.1.0

families: [
  { name: "atom-family", version: "patch", packages: [...] }
]
// → all three become 5.1.4
```

This means **adding a new low-versioned package to a family is intentional surgery**: it jumps to match the family on the first build. The family version is the compatibility contract — if you publish `react-atom@6.0.0`, every other family member must also be `6.0.0` so consumers can lock to one version.

### Strategy on the family, not on members

`version` is **family-level only**. Family-member entries don't accept their own `version` — it's whatever the family decided.

```ts
families: [
  {
    name: "atom-family",
    version: "minor",                       // ← family-level
    packages: [
      { name: "@scope/atom",       root: "../atom" },        // no version
      { name: "@scope/react-atom", root: "../react-atom" },  // no version
    ],
  },
]
```

## Picking the right strategy

This is a semantic question, not a pkgist one. The convention:

| When changes are | Use |
|---|---|
| Bug fixes, internal refactors, docs, lockfile/CI updates with NO API surface change | `"patch"` |
| Strictly additive: new exports, new optional params, new fields on result types | `"minor"` |
| Anything a consumer's code would have to change to absorb (removals, renames, signature changes, default-behavior flips, runtime deps bumped major) | `"major"` |

For families specifically: pick based on the **most significant change in any member**. If one family member made a breaking change, the family bumps major even if the others only had docs updates.

## Explicit strings for unusual paths

The literal-string form unlocks:

- **First 1.0.0 release**: `version: "1.0.0"` (rather than bumping 0.x.x)
- **Re-publishing after a botched release**: `version: "2.1.3"` to overwrite intent (only works if npm hasn't seen this version — never use to "force overwrite" a published version, which npm prevents anyway)
- **Pre-releases**: `version: "2.0.0-beta.1"`, then `"2.0.0-beta.2"`, then `"2.0.0"` for the final cut
- **Hotfix lineage**: `version: "1.2.3"` to ship a patch on an old major if you've moved past it
