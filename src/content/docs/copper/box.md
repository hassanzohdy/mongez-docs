---
title: "Box"
name: mongez-copper-box
description: |
  Wrap CLI text in a Unicode (single / double / round / bold) or ASCII border, with padding, margin, color, and alignment. ANSI-aware width measurement so colored content lines up correctly.
sidebar:
  order: 50
---

```ts
import { box } from "@mongez/copper";

console.log(
  box("Deploy successful", {
    borderStyle: "round",
    borderColor: "green",
    padding: 1,
  }),
);
```

```
╭─────────────────────╮
│                     │
│  Deploy successful  │
│                     │
╰─────────────────────╯
```

## Options

| Option | Default | Note |
|---|---|---|
| `padding` | `1` | Internal blank lines + side spaces |
| `margin` | `0` | Blank lines above and below the box |
| `borderStyle` | `"round"` | `"single"` `"double"` `"round"` `"bold"` `"ascii"` |
| `borderColor` | (none) | Any `ColorName` |
| `align` | `"left"` | `"left"` `"center"` `"right"` |

## Border styles

| Style | Sample |
|---|---|
| `single` | `┌─┐ │ └─┘` |
| `double` | `╔═╗ ║ ╚═╝` |
| `round` | `╭─╮ │ ╰─╯` |
| `bold` | `┏━┓ ┃ ┗━┛` |
| `ascii` | `+-+ \| +-+` — for terminals that don't render box-drawing |

## Multi-line content

```ts
box("Line one\nLonger second line\nThird", { align: "center" });
```

All lines are padded to the longest one, so the right border lines up. Width measurement strips ANSI first, so colored lines (`box(colors.red("…"))`) don't skew the box.
