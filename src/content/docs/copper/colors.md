---
title: "Colors"
name: mongez-copper-colors
description: |
  ANSI colorizer with a 20+ named palette (basic 4-bit + 256-color hues like `lime`, `teal`, `brown`, `gold`, `chocolate`, `pink`, `purple`, `lavender`, `indigo`, `orange`, `slate`), foreground / background / *Bright* / *bgBright* variants, plus modifiers (`bold`, `italic`, `dim`, `underline`, `inverse`, `hidden`, `strikethrough`, `reset`). Supports BOTH chalk-style chaining (`colors.red.bold("x")`) and picocolors-style composition (`colors.red(colors.bold("x"))`). `NO_COLOR` and `FORCE_COLOR` aware.
sidebar:
  order: 50
---

Chain colors and modifiers chalk-style. Each chain step builds a fresh callable formatter — lazy, stateless, reusable.

```ts
import { colors, createColors, type ColorName, type ChainFormatter } from "@mongez/copper";

colors.red("error");
colors.red.bold("error");
colors.bgWhite.black.bold(" WARN ");
colors.gray.italic("hint");
colors.red.bold.underline("critical");

const danger = colors.red.bold.underline;
danger("File not found");
danger("Connection refused");
```

> Composition (`colors.red(colors.bold(x))`) produces identical ANSI output and is the natural shape for indexed access (`colors[name](x)` where `name` is a runtime `ColorName`). Every chain example below has a composition equivalent — pick whichever reads better at the call site.

## Modifiers

| Function | Effect |
|---|---|
| `bold(s)` | Bold |
| `dim(s)` | Faint |
| `italic(s)` | Italic |
| `underline(s)` | Underline |
| `strikethrough(s)` | Strikethrough |
| `inverse(s)` | Swap fg/bg |
| `hidden(s)` | Invisible (still copies on select) |
| `reset(s)` | Wraps with `CSI 0` on both sides |

## Palette (foreground)

Each row also has `*Bright`, `bg*`, and `bgBright*` variants unless noted.

| Family | Names |
|---|---|
| Neutral | `black`, `gray`, `white`, `blackBright`, `whiteBright` |
| Slate | `slate`, `slateBright` |
| Red | `red`, `redBright` |
| Orange | `orange`, `orangeBright` |
| Yellow | `yellow`, `yellowBright` |
| Gold | `gold`, `goldBright` |
| Chocolate | `chocolate`, `chocolateBright` |
| Brown | `brown`, `brownBright` |
| Green | `green`, `greenBright` |
| Lime | `lime`, `limeBright` |
| Teal | `teal`, `tealBright` |
| Cyan | `cyan`, `cyanBright` |
| Blue | `blue`, `blueBright` |
| Magenta | `magenta`, `magentaBright` |
| Purple | `purple`, `purpleBright` |
| Pink | `pink`, `pinkBright` |
| Lavender | `lavender`, `lavenderBright` |
| Indigo | `indigo`, `indigoBright` |

> The standard 4-bit colors (`red`/`green`/…/`white`) use the 30-37 / 90-97 sequences. The extended hues (`lime`, `teal`, `brown`, `gold`, …) use 256-color sequences (`\x1b[38;5;Nm`) so terminals must support 256 colors — which all common modern terminals do.

## `createColors(enabled?)` — force on or off

```ts
const off = createColors(false);
off.red("hi");        // "hi"  (no ANSI added)
off.isColorSupported; // false

const on = createColors(true);
on.red("hi");         // "\x1b[31mhi\x1b[39m"
```

Use this to:

- Strip ANSI from a colored builder before snapshotting a test (`createColors(false).red(x)`).
- Force ANSI in a sub-process whose `stdout` isn't a TTY but is being captured.
- Build a separate "diff" or "patch" themed instance with its own palette.

## Typed color names (the composition case)

When the color name is decided at runtime, indexed access + composition is the right shape — chains are a compile-time-only thing:

```ts
import { colors, type ColorName } from "@mongez/copper";

function paint(level: "ok" | "fail", text: string) {
  const c: ColorName = level === "ok" ? "green" : "red";
  return colors[c](text);
}

// Add a modifier via composition:
colors[c](colors.bold(text));
```

`ColorName` is derived from the `COLOR_NAMES` tuple — it excludes the meta keys `isColorSupported` and `createColors` so `colors[name]` is always a callable formatter.

## Replacing chalk

Near-1:1 import swap thanks to chaining:

```ts
- import chalk from "chalk";
+ import { colors } from "@mongez/copper";

- chalk.red(text);
+ colors.red(text);

- chalk.red.bold(text);
+ colors.red.bold(text);

- chalk.bgWhite.black.bold(text);
+ colors.bgWhite.black.bold(text);
```

For chalk's tagged-template syntax (`chalk\`{red ${value}}\``), use `colorize-template` against the copper instance:

```ts
import { createColorize } from "colorize-template";
import { colors } from "@mongez/copper";

const colorize = createColorize(colors);
colorize`{red.bold Build} took {yellow ${ms}ms}`;
```

## Composition safety

When you nest `colors.x(colors.y(text))` (or chain `colors.x.y(text)`) and `text` already contains the inner closer code, copper rewrites internal closers to re-open the outer color — so chains do not leak:

```ts
colors.bold(colors.red("inner"));
// "\x1b[1m\x1b[31minner\x1b[39m\x1b[22m"  ← red closer (39m) does not eat bold
```
