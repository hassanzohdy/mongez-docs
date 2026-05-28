---
title: "Spinner"
name: mongez-copper-spinner
description: |
  Single-line animated CLI spinner with `start` / `stop` / `update` / `succeed` / `fail` / `warn` / `info` finalizers, customizable frames, interval, and color. Auto-degrades to a single-line print in non-TTY streams (CI, piped output).
sidebar:
  order: 50
---

```ts
import { spinner } from "@mongez/copper";

const sp = spinner({ text: "Compiling…" }).start();
try {
  await build();
  sp.succeed("Build complete");
} catch (err) {
  sp.fail("Build failed");
  throw err;
}
```

## Options

| Option | Default | Note |
|---|---|---|
| `text` | `""` | Trailing message; can be changed live via `.update(...)` |
| `frames` | `symbols.spinner` (Braille on modern terms, ASCII on legacy `cmd.exe`) | Array of strings, cycled |
| `interval` | `80` | Milliseconds between frames |
| `color` | `"cyan"` | Any `ColorName` |
| `stream` | `process.stdout` | Pass `process.stderr` to keep progress on stderr |

## Handle methods

| Method | Behavior |
|---|---|
| `start(text?)` | Begin animating; if already running, no-op |
| `update(text)` | Replace the trailing text without restarting |
| `stop()` | Clear the line and stop the interval |
| `succeed(text?)` | Stop, write `green ✔ <text>` + newline |
| `fail(text?)` | Stop, write `red ✖ <text>` + newline |
| `warn(text?)` | Stop, write `yellow ⚠ <text>` + newline |
| `info(text?)` | Stop, write `cyan ℹ <text>` + newline |
| `.isSpinning` | Boolean reflecting interval status |

## Non-TTY fallback

When `stream.isTTY` is `false` (CI, piped output, capture buffers), the spinner does **not** animate. Instead:

- `.start()` prints the text once with a newline.
- Finalizers (`succeed`/`fail`/`warn`/`info`) print their colored marker + final text on a single line.

This means logs in CI stay readable line-by-line — no cursor jiggling, no carriage-return artifacts.

## Awaiting work

```ts
async function withSpinner<T>(text: string, run: () => Promise<T>): Promise<T> {
  const sp = spinner({ text }).start();
  try {
    const result = await run();
    sp.succeed();
    return result;
  } catch (err) {
    sp.fail();
    throw err;
  }
}
```

> The spinner's interval is `unref`'d, so a forgotten `.stop()` won't keep your Node process alive. Still — always pair `start()` with a finalizer in the same `try/finally` block.
