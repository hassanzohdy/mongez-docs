---
title: "Utilities"
name: mongez-copper-utilities
description: |
  Small CLI utilities — `link` (OSC-8 terminal hyperlinks with `text (url)` fallback), `stripAnsi` (remove every ANSI escape including OSC-8), `symbols` (✔ ✖ ℹ ⚠ → ❯ … • ─ + Braille spinner frames with ASCII fallbacks on legacy Windows), `isColorSupported`, `detectColorSupport`.
sidebar:
  order: 50
---

## `link(text, url, options?)`

Build a clickable terminal hyperlink using the OSC-8 escape sequence. Renders as a real clickable link in modern terminals (iTerm2, Windows Terminal, GNOME Terminal, Kitty, Wezterm, VSCode's integrated terminal). Falls back to `text (url)` everywhere else.

```ts
import { link, colors } from "@mongez/copper";

console.log(`See ${link("the docs", "https://github.com/hassanzohdy/copper")}`);
console.log(`Report bugs at ${colors.cyan(link("issues", "https://github.com/hassanzohdy/copper/issues"))}`);
```

| Option | Default | Behavior |
|---|---|---|
| `fallback` | `"text-and-url"` | Print `text (url)` when ANSI is unsupported |
| `fallback: "text-only"` | — | Print only `text` when unsupported |

## `stripAnsi(input)`

Remove every ANSI escape sequence — colors, modifiers, cursor moves, **and** OSC-8 hyperlinks.

```ts
import { stripAnsi, colors, link } from "@mongez/copper";

stripAnsi(colors.red.bold("error"));                         // "error"
stripAnsi(link("docs", "https://example.com"));              // "docs"
stripAnsi("plain");                                          // "plain"
stripAnsi(42);                                               // "42"
```

Use this when:

- Asserting on the visible output of a colored function in tests.
- Measuring the *visible* width of a string for layout (lengths of raw strings include the invisible ANSI bytes).
- Writing colored content to a file that should not carry ANSI.

## `symbols`

Glyph set with automatic ASCII fallbacks on classic Windows `cmd.exe`. Detection: if `process.platform === "win32"` AND none of `WT_SESSION` / `TERM_PROGRAM` / `TERM=xterm-256color` is set, use the ASCII set.

| Key | Fancy | ASCII fallback |
|---|---|---|
| `tick` | `✔` | `√` |
| `cross` | `✖` | `×` |
| `info` | `ℹ` | `i` |
| `warning` | `⚠` | `‼` |
| `arrow` | `→` | `->` |
| `pointer` | `❯` | `>` |
| `ellipsis` | `…` | `...` |
| `bullet` | `•` | `*` |
| `line` | `─` | `-` |
| `spinner` | `["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]` | `["-", "\\", "|", "/"]` |

```ts
import { symbols, colors } from "@mongez/copper";

console.log(`${colors.green.bold(symbols.tick)} Saved`);
console.log(`${colors.red.bold(symbols.cross)} Failed`);
console.log(`${colors.gray(symbols.pointer)} Press any key`);
```

## `isColorSupported` and `detectColorSupport()`

```ts
import { isColorSupported, detectColorSupport } from "@mongez/copper";

if (isColorSupported) {
  // safe to emit ANSI
}

// Re-evaluate at runtime (after env mutation, e.g. inside a CLI flag parser):
const enabled = detectColorSupport();
```

`isColorSupported` is the cached result of `detectColorSupport()` at module-load time. The detection rules are documented in the [overview skill](../overview/SKILL.md#color-support-detection).
