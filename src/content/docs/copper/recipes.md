---
title: "Recipes"
name: mongez-copper-recipes
description: |
  End-to-end recipes for @mongez/copper — combining spinner + progress + log + colors + box + link to build CLI experiences: themed deploy script, file-walker with progress, error reporting with boxed callouts, --quiet / --no-color flag handling, dual stdout/stderr logging.
sidebar:
  order: 99
---

## Themed deploy script

Spinner while uploading, progress bar per file, final success/failure box.

```ts
import { spinner, progress, box, log, colors } from "@mongez/copper";

async function deploy(files: string[]) {
  const auth = spinner({ text: "Authenticating…" }).start();
  try {
    await login();
    auth.succeed("Authenticated");
  } catch (err) {
    auth.fail("Auth failed");
    log.error(err);
    return;
  }

  const bar = progress({ total: files.length, color: "lime" });
  for (const file of files) {
    try {
      await upload(file);
    } catch (err) {
      bar.stop();
      log.error(`Failed on ${file}:`, err);
      console.log(box(`Deploy aborted at ${file}`, { borderColor: "red" }));
      return;
    }
    bar.tick();
  }
  bar.done();

  console.log(box(`${files.length} files deployed`, {
    borderStyle: "round",
    borderColor: "green",
    padding: 1,
  }));
}
```

## Refusing to color piped output

Most CLIs should respect `NO_COLOR` automatically — `@mongez/copper` already does. If you need to *enforce* uncolored output (e.g. when emitting structured logs to a file), build a forced-off instance:

```ts
import { createColors } from "@mongez/copper";

const plain = createColors(false);
fs.appendFileSync("deploy.log", plain.gray("[" + new Date().toISOString() + "] ") + "done\n");
```

## Honoring a `--quiet` flag

```ts
import { createLogger } from "@mongez/copper";

const quiet = process.argv.includes("--quiet");
const log = createLogger({
  level: quiet ? "warn" : "debug",
  stream: process.stderr,
});

log.info("verbose status");   // hidden in --quiet
log.warn("worth showing");    // always visible
```

## Capturing CLI output for tests

`stripAnsi` removes color/cursor codes; pair with a custom stream:

```ts
import { createLogger, stripAnsi } from "@mongez/copper";

function captureLogs(run: (log: ReturnType<typeof createLogger>) => void) {
  const lines: string[] = [];
  const stream = {
    write(c: string) { lines.push(c); return true; },
  } as unknown as NodeJS.WritableStream;

  run(createLogger({ stream }));
  return lines.map(stripAnsi);
}

const out = captureLogs(log => {
  log.info("started");
  log.success("done");
});
// ["ℹ started\n", "✔ done\n"]
```

## Clickable error link

Surface a docs URL the user can click to get unstuck:

```ts
import { colors, link, symbols } from "@mongez/copper";

function reportError(code: string, message: string) {
  const url = `https://errors.example.com/${code}`;
  console.error(`${colors.red.bold(symbols.cross)} ${message}`);
  console.error(`  ${colors.gray("See:")} ${link(code, url)}`);
}
```

In terminals that don't support OSC-8 the user still sees `code (https://errors.example.com/...)`.

## Banner on startup

```ts
import { box, colors, link } from "@mongez/copper";

console.log(box([
  colors.cyan.bold("my-cli") + " " + colors.gray("v" + pkg.version),
  "",
  `Docs: ${link("read here", "https://example.com/docs")}`,
].join("\n"), {
  borderStyle: "double",
  borderColor: "cyan",
  padding: 1,
  align: "center",
}));
```

## Walking a directory with progress

Pair with `@mongez/fs`:

```ts
import { listAll } from "@mongez/fs";
import { spinner, progress, log } from "@mongez/copper";

const sp = spinner({ text: "Scanning…" }).start();
const files = await listAll("./src");
sp.succeed(`Found ${files.length} files`);

const bar = progress({ total: files.length });
for (const f of files) {
  await processFile(f);
  bar.tick();
}
bar.done();
log.success("Done");
```

## Error-only stderr, info to stdout

```ts
import { createLogger } from "@mongez/copper";

const out = createLogger({ stream: process.stdout, level: "info" });
const err = createLogger({ stream: process.stderr, level: "warn" });

out.info("Building…");
err.warn("Deprecated flag --legacy");
err.error("Build failed");
```

Pipe to grep or jq: `cli 2>/dev/null | head` keeps the warnings off the success pipeline.
