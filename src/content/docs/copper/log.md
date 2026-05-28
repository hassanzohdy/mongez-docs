---
title: "Log"
name: mongez-copper-log
description: |
  Themed CLI logger with `debug` / `info` / `success` / `warn` / `error` levels, colored symbol prefixes, level filtering, and a custom output stream. Errors serialize stack traces; plain values pass through `JSON.stringify` for structured printing.
sidebar:
  order: 50
---

```ts
import { log } from "@mongez/copper";

log.info("Starting server on", 4000);
log.success("Build complete");
log.warn("Cache miss for", { key: "user:42" });
log.error(new Error("Database unreachable"));
log.debug("payload", payload);
```

Each call writes one line prefixed with a colored level symbol — `ℹ` info, `✔` success, `⚠` warn, `✖` error, `•` debug (with Windows ASCII fallbacks).

## Default singleton

`log` is preconfigured: every level enabled, writing to `process.stdout`. Import and go.

## `createLogger(options)`

| Option | Default | Note |
|---|---|---|
| `level` | `"debug"` | Suppress lower priorities. Order: `debug < info < success < warn < error` |
| `stream` | `process.stdout` | Switch to `process.stderr` to keep warnings off piped stdout |
| `levels` | (built-ins) | Per-level `{ symbol, label, color }` overrides |

```ts
import { createLogger, colors, symbols } from "@mongez/copper";

const log = createLogger({
  level: "warn",                       // hide debug/info/success
  stream: process.stderr,
  levels: {
    error: { symbol: "💥", label: "BOOM", color: colors.redBright },
  },
});
```

## Argument handling

Multiple args are joined by space. Each arg is stringified:

- `string` → as-is
- `Error` → `error.stack ?? error.message`
- everything else → `JSON.stringify(value)`

```ts
log.info("port", 4000, { secure: true });
// ℹ port 4000 {"secure":true}

log.error(new TypeError("nope"));
// ✖ TypeError: nope
//     at ...
```

## Level filtering

```ts
const log = createLogger({ level: process.env.QUIET ? "warn" : "debug" });
log.debug("verbose stuff"); // hidden when QUIET=1
log.warn("still shown");
```
