---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/copper` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



<details class="changelog-version" open>
<summary><span class="cl-version">[2.1.2]</span> <span class="cl-label">Docs lead with chaining</span> <span class="cl-counts">Changed 2</span></summary>

### Changed

- Reframed README, colors SKILL.md, recipes SKILL.md, utilities SKILL.md, and llms-full.txt so chaining (`colors.red.bold(x)`) is the primary call style in every example. Composition (`colors.red(colors.bold(x))`) is documented as an alternative with one explicit use case — runtime-decided color names via `colors[name](x)` typed by `ColorName`.
- No code changes; chains and composition still produce identical ANSI output.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[2.1.1]</span> <span class="cl-label">CI matrix fix</span> <span class="cl-counts">Changed 1</span></summary>

### Changed

- Dropped Node 18 from the CI matrix (Node 18 reached EOL on April 30, 2025, and `vitest@3` transitive dependencies fail to install cleanly there). Matrix is now Node 20 + Node 22 on Ubuntu, plus Node 20 on Windows.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[2.1.0]</span> <span class="cl-label">Chainable colors</span> <span class="cl-counts">Added 4 · Changed 2 · Fixed 1</span></summary>

### Added

- **Chalk-style chaining** on every color and modifier — `colors.red.bold("hi")` is now equivalent to `colors.red(colors.bold("hi"))`. Both produce identical ANSI output. Chains compose lazily and are stateless: `const danger = colors.red.bold.underline;` is a plain callable formatter you can store, pass, and reuse.
- Exported `ChainFormatter` type — the recursive `Formatter & { [K in ColorName]: ChainFormatter }` shape that powers chaining.
- Exported `COLOR_NAMES` tuple — the single source of truth for `ColorName`.
- 6 new vitest cases covering chain composition, multi-step chains, independence, disabled-instance chains, and meta-key isolation. Total: 44 tests.

### Changed

- `ColorName` is now derived from the `COLOR_NAMES` const tuple instead of from `keyof Colors` (which was self-referential). The resulting union is identical to v2.0.0.
- Dropped `@vitest/coverage-v8` dev dep and the `test:coverage` script — it pulled a postinstall that broke on Node 18 CI. `yarn test` still produces the same suite output; add coverage back on a per-project basis.

### Fixed

- `bgIndigoBright` close sequence was `\x1b[39m` (fg reset) instead of `\x1b[49m` (bg reset). Background reset now correctly emits CSI 49.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[2.0.0]</span> <span class="cl-label">Major rewrite</span> <span class="cl-counts">Breaking changes 6 · Added 12 · Changed 2</span></summary>

### Breaking changes

- Renamed `colors.brown2`, `colors.brown2Bright`, `colors.bgBrown2`, `colors.bgBrown2Bright` → `brown`, `brownBright`, `bgBrown`, `bgBrownBright`. The `2` suffix was leftover scaffolding; the new names match what the v1 README documented.
- Renamed `colors.limeGreen`, `colors.limeGreenBright`, `colors.bgLimeGreen`, `colors.bgLimeGreenBright` → `lime`, `limeBright`, `bgLime`, `bgLimeBright`. Same reason.
- `displayLoadingBar(iter, delay)` now returns `{ promise, stop }` instead of `void`. v1 had no way to cancel the interval. Prefer the new `progress({ total })` API.
- `displayThreeDotsAnimation(iter, delay)` now returns a `SpinnerHandle`. v1 ran forever with no stop hook. Prefer the new `spinner({ text }).start()` API.
- `FORCE_COLOR=0` and `FORCE_COLOR=false` now **disable** colors (v1 enabled colors as long as the variable was *defined*).
- `tty` is loaded lazily — importing `@mongez/copper` in a browser bundle no longer crashes.

### Added

- **`spinner`** — animated single-line spinner with `start` / `update` / `stop` / `succeed` / `fail` / `warn` / `info` finalizers. TTY-aware fallback for CI / piped output. Interval is `unref`'d.
- **`progress`** — known-total progress bar with `tick` / `update` / `done` / `stop` and template tokens (`:bar` `:current` `:total` `:percent` `:elapsed` `:eta`).
- **`log` + `createLogger`** — themed CLI logger with `debug` / `info` / `success` / `warn` / `error`, level filtering, per-level theme overrides, custom output stream, and Error stack serialization.
- **`box`** — Unicode / ASCII bordered text with single / double / round / bold / ascii styles, padding, margin, alignment, and border color. ANSI-aware width measurement so colored content aligns correctly.
- **`link`** — OSC-8 clickable terminal hyperlink with `text (url)` or `text-only` fallback.
- **`stripAnsi`** — remove every ANSI escape including OSC-8 hyperlinks.
- **`symbols`** — `tick` / `cross` / `info` / `warning` / `arrow` / `pointer` / `ellipsis` / `bullet` / `line` and Braille spinner frames, with ASCII fallbacks on legacy Windows `cmd.exe`.
- **`detectColorSupport()`** — re-evaluate color support against the current env/argv (in addition to the cached `isColorSupported` boolean).
- Exported types: `Colors`, `ColorName`, `Formatter`, `BoxStyle`, `BoxOptions`, `SpinnerHandle`, `SpinnerOptions`, `ProgressHandle`, `ProgressOptions`, `LogLevel`, `Logger`, `LoggerOptions`, `SymbolName`.
- 38 vitest cases covering colors, support detection, strip-ansi, link, box, log, spinner, and progress.
- CI matrix on Node 18 / 20 / 22 on Ubuntu and Node 20 on Windows.
- Per-feature skill docs under `skills/` (overview, colors, spinner, progress, log, box, utilities, recipes) plus `llms.txt` and `llms-full.txt` for AI agent consumption.

### Changed

- `createColors(enabled)` now returns a type-recoverable object exported as `Colors`. The factory is re-exposed on every instance (`colors.createColors(false)`).
- Color-support detection has a new priority order documented in the overview skill and README.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.0.1]</span> <span class="cl-label">Initial release</span></summary>

- `colors` object with the 20+ palette (under v1 names — `brown2*`, `limeGreen*`).
- `createColors(enabled)` factory.
- `isColorSupported` flag.
- `displayLoadingBar` and `displayThreeDotsAnimation` legacy animations.

</details>
