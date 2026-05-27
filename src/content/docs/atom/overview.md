---
title: "Atom"
name: mongez-atom-overview
description: |
  Mental model, exports, and decision guide for `@mongez/atom` — the framework-agnostic state primitive at the core of the Mongez state family.
  TRIGGER when: code first imports anything from `@mongez/atom` (`createAtom`, `atomCollection`, `derive`, `AtomStore`, `createAtomStore`, `enableAtomDevtools`, `getAtom`, `atomsList`, `atomsObject`); user asks "what is @mongez/atom", "which package should I use for state — @mongez/atom or @mongez/react-atom", "what does @mongez/atom export", or "give me a high-level architecture of Mongez state"; `import { ... } from "@mongez/atom"` with no specific topic yet identified.
  SKIP: any deep how-to question that already maps to a focused skill (`mongez-atom-atoms`, `mongez-atom-collections`, `mongez-atom-derived`, `mongez-atom-persist`, `mongez-atom-atom-store`, `mongez-atom-devtools`, `mongez-atom-actions`, `mongez-atom-recipes`); React-specific hook questions (`@mongez/react-atom`); server-state caching (`@mongez/atomic-query`).
sidebar:
  order: 10
  label: "Overview"
---

## Install

```sh
# npm
npm install @mongez/atom

# yarn
yarn add @mongez/atom

# pnpm
pnpm add @mongez/atom
```

Peer deps installed automatically: `@mongez/events`, `@mongez/reinforcements`.

## Quick example

Atoms aren't just values — they're values with verbs bound to them. Call domain methods directly on the atom instead of writing setters everywhere:

```ts
import { createAtom } from "@mongez/atom";

const sidebar = createAtom({
  key: "ui.sidebar",
  default: false,
  actions: {
    open()   { this.update(true); },
    close()  { this.update(false); },
    toggle() { this.update(!this.value); },
  },
});

sidebar.toggle();   // no setSidebar(!sidebar) ceremony
sidebar.value;      // true
```

## When to use

Load this skill when the user:
- Is new to `@mongez/atom` and needs orientation
- Asks "which package should I use for state?"
- Asks about lifecycle events, the global registry, or DevTools wiring
- Needs to understand the relationship between `@mongez/atom`, `@mongez/react-atom`, and `@mongez/atomic-query`

## Mental model

An **atom** is not just a value — it is a value bundled with methods (actions) that mutate it. Instead of writing free-standing setter helpers, you define verbs directly on the atom:

```ts
sidebar.toggle();     // not: setSidebar(!sidebar.value)
cart.push(item);      // not: setCart([...cart.value, item])
auth.login(creds);    // not: dispatch({ type: "AUTH_LOGIN", payload: creds })
```

All atoms live in a module-level registry (`atoms` object exported from the package). Each atom is keyed by the `key` string passed to `createAtom`. Keys should be namespaced with dots: `"ui.sidebar"`, `"cart"`, `"user.profile"`.

## Package hierarchy

| Package | Role |
|---|---|
| `@mongez/atom` | Core. Framework-agnostic atom factory, SSR isolation, persistence, DevTools. Use in any JS/TS environment. |
| `@mongez/react-atom` | React adapter. Wraps `@mongez/atom` with hooks (`useAtom`, `useValue`, `useState`), `<AtomStoreProvider>`, and SSR hydration helpers. Use in React apps. |
| `@mongez/atomic-query` | Server-state cache on top of atoms. `useQuery`, `useMutation`, `useInfiniteQuery`. Use for remote data fetching. |

**Rule of thumb**: `@mongez/atom` for shared, UI-independent logic. `@mongez/react-atom` for anything that drives component re-renders. `@mongez/atomic-query` for async server data.

## Exports at a glance

```ts
import {
  // Core factory
  createAtom,

  // Array-specialized factory (adds push/pop/remove/map/etc.)
  atomCollection,

  // Computed/derived atom with auto-tracked dependencies
  derive,

  // SSR per-request isolation
  AtomStore,
  createAtomStore,

  // Redux DevTools bridge (browser-only, opt-in)
  enableAtomDevtools,

  // Global registry helpers
  getAtom,
  atomsList,
  atomsObject,

  // Types
  type Atom,
  type AtomOptions,
  type AtomActions,
  type PersistAdapter,
  type PersistOption,
} from "@mongez/atom";
```

## Lifecycle events

Every atom emits on the `@mongez/events` bus under `atoms.${key}`:

| Event | Fired by |
|---|---|
| `atoms.${key}.update` | `update()`, `change()`, `merge()` |
| `atoms.${key}.reset` | `reset()`, `silentReset()` |
| `atoms.${key}.delete` | `destroy()` |

The namespace is segment-aware: destroying `users.1` does **not** match `users.10`.

## DevTools

```ts
import { enableAtomDevtools } from "@mongez/atom";

// Call once at app entry, dev only.
if (process.env.NODE_ENV !== "production") {
  enableAtomDevtools({
    name: "MyApp",
    ignore: [/^mouse\./, /^scroll\./],  // skip high-frequency atoms
    scanInterval: 1000,                  // ms, default; picks up lazily registered atoms
  });
}
```

- Connects to `window.__REDUX_DEVTOOLS_EXTENSION__`. No-op when extension is absent.
- Tree-shaken when never imported.
- Time-travel via `JUMP_TO_STATE` restores all atoms via `silentUpdate`.
- Returns a teardown function.

## Key pitfalls

- **Key collisions**: keys are global. If two `createAtom` calls share the same key, the second overwrites the first in the registry. Prefix keys by domain (`"ui.sidebar"`, not `"sidebar"`).
- **No reference equality shortcut for objects**: `update()` short-circuits only when the new value `=== currentValue`. For object atoms, always pass a new reference or use `merge()`/`change()`.
- `@mongez/atom` has no React — never import `useAtom` from it. That lives in `@mongez/react-atom`.
