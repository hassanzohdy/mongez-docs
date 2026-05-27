---
title: "Devtools"
name: mongez-atom-devtools
description: |
  How to enable Redux DevTools integration for `@mongez/atom` — setup, options, time-travel, and filtering high-frequency atoms.
  TRIGGER when: code imports or calls `enableAtomDevtools`, uses `EnableDevtoolsOptions`, or passes `name` / `ignore` / `scanInterval` options for DevTools; user asks "how do I debug atoms with Redux DevTools", "how do I time-travel atom state", or "how do I skip noisy atoms in the DevTools timeline"; `import { enableAtomDevtools } from "@mongez/atom"`.
  SKIP: defining atoms (use `mongez-atom-atoms` / `mongez-atom-defining-atoms`); production-only / non-debug code paths; logging atom values to console without the Redux extension; React-renderer profiling (DevTools handles state, React Profiler handles renders).
sidebar:
  order: 80
---

`enableAtomDevtools()` pipes every atom update into the Redux DevTools browser extension. Opt-in, browser-only, tree-shaken when not imported.

## Usage

```ts
import { enableAtomDevtools } from "@mongez/atom";

if (process.env.NODE_ENV !== "production") {
  enableAtomDevtools({ name: "MyApp" });
}
```

## Options

```ts
type EnableDevtoolsOptions = {
  name?: string;                            // label shown in DevTools UI
  ignore?: Array<RegExp | string>;          // skip atoms whose key matches
  scanInterval?: number;                    // ms between scans for newly-registered atoms; default 1000
};
```

The returned function tears down all subscriptions and disconnects the extension. Call it on hot-reload or test teardown if needed.

## What you get

- **Initial snapshot.** Every atom registered at call time is `init`-ed into the timeline.
- **Update timeline.** Every `atom.update`, `change`, `merge` produces an entry typed as `${atomKey}/update` with the new value as payload.
- **Reset / destroy entries.** Lifecycle events show up as `${atomKey}/reset` and `${atomKey}/destroy`.
- **Time-travel.** Jumping back in the DevTools timeline restores every atom's value via `silentUpdate` + a synthetic update event so React subscribers re-render.

## Ignoring high-frequency atoms

```ts
enableAtomDevtools({
  ignore: [
    /^mouse\./,        // every mouse atom
    /^scroll\./,
    "perf.heartbeat",  // exact string match
  ],
});
```

## Catching late-registered atoms

Apps that lazy-load routes register atoms after `enableAtomDevtools` fires. A polling scan picks them up — defaults to 1s. Tune via `scanInterval` if you want faster discovery or less wakeup.
