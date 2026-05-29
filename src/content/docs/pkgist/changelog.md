---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/pkgist` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.2]

### Added

- This changelog. No code changes — the package remains the tsdown-powered build/version/publish tool: standalone + version-synchronised families, dual ESM+CJS output, asset cloning, git tag + push automation, and `--dry-run`.

> Version history prior to 1.1.0 is available via the git tags and GitHub releases on [hassanzohdy/pkgist](https://github.com/hassanzohdy/pkgist).

## [1.1.0]

### Added

- **`commit` field accepts `true` / `false`** in addition to a string. `true` auto-generates a `Released <version>` message (set-and-forget); `false` explicitly skips git; a string is used verbatim; omitting it skips git (back-compat).
