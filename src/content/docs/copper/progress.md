---
title: "Progress"
name: mongez-copper-progress
description: |
  Known-total CLI progress bar with `tick` / `update` / `done` / `stop`, customizable width, fill/empty glyphs, color, and template tokens (`:bar` `:current` `:total` `:percent` `:eta` `:elapsed`). TTY-aware — gracefully prints a single completion line in non-TTY streams.
sidebar:
  order: 50
---

```ts
import { progress } from "@mongez/copper";

const bar = progress({ total: files.length });
for (const file of files) {
  await upload(file);
  bar.tick();
}
bar.done();
```

## Options

| Option | Default | Note |
|---|---|---|
| `total` | — (required) | Target value `current` walks toward |
| `width` | `30` | Bar character width (filled + empty combined) |
| `complete` | `"█"` | Glyph for filled segments |
| `incomplete` | `"░"` | Glyph for empty segments |
| `color` | `"green"` | Any `ColorName`, applied to the filled glyphs |
| `format` | `":bar :percent  :current/:total"` | Tokens listed below |
| `stream` | `process.stdout` | Switch to `stderr` if stdout is being piped |

### Format tokens

| Token | Renders |
|---|---|
| `:bar` | The colored bar |
| `:current` | Integer current value |
| `:total` | Integer total |
| `:percent` | Right-padded `XX.X%` |
| `:elapsed` | `XX.Xs` since start |
| `:eta` | `XX.Xs` projected remaining |

```ts
progress({
  total: 100,
  width: 40,
  format: ":bar  :percent  ETA :eta",
});
```

## Handle methods

| Method | Behavior |
|---|---|
| `tick(delta = 1)` | Increment `current` by `delta`; clamped to `total` |
| `update(value)` | Set `current` directly; clamped to `[0, total]` |
| `done()` | Snap to `total`, write final newline (TTY) or full line (non-TTY) |
| `stop()` | Abort without finishing; clears the current line |
| `.current` / `.total` / `.isComplete` | Read-only state getters |

## TTY vs non-TTY

In a TTY, the bar redraws in place using `cursorTo(0)` + `clearLine(1)`. In a non-TTY stream (CI, piped, captured), `tick`/`update` are silent — only `done()` writes a single line with the final rendered template. This keeps CI logs scannable and prevents megabytes of garbled redraws.

## Composing with spinner

If you don't know the total up front (downloading from a streaming API, walking a directory of unknown size), start with a `spinner` and switch once you do:

```ts
const sp = spinner({ text: "Discovering files…" }).start();
const files = await collect();
sp.succeed(`Found ${files.length} files`);

const bar = progress({ total: files.length, color: "lime" });
for (const f of files) {
  await process(f);
  bar.tick();
}
bar.done();
```
