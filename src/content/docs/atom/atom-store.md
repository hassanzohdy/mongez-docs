---
title: "Atom Store"
name: mongez-atom-atom-store
description: |
  How to use `AtomStore` and `createAtomStore` for per-request SSR isolation — creating scoped atom clones, hydrating snapshots, and tearing down stores after each request.
  TRIGGER when: code imports `AtomStore`, `createAtomStore`, or calls `store.use`, `store.get`, `store.has`, `store.list`, `store.hydrate`, `store.snapshot`, `store.destroy` from `@mongez/atom`; user asks "how do I isolate atom state per SSR request", "why are atoms leaking between requests", or "how do I serialize and rehydrate atoms"; `import { createAtomStore, AtomStore } from "@mongez/atom"`.
  SKIP: defining the atoms themselves (use `mongez-atom-atoms` or `mongez-atom-defining-atoms`); React-side `AtomStoreProvider` / `useAtomStore` wiring (lives in `@mongez/react-atom`); generic client-only state without SSR (no store needed).
sidebar:
  order: 50
---

## When to use

Load this skill when the user:
- Runs SSR (Next.js, Remix, Express + React, Fastify) and shares atom state between requests
- Uses `AtomStore` or `createAtomStore` from `@mongez/atom`
- Asks why two concurrent requests overwrite each other's atoms
- Needs to serialize server-side atom state and send it to the client for hydration
- Is wiring up `<AtomStoreProvider>` from `@mongez/react-atom`

## The problem AtomStore solves

Atoms registered with `createAtom` live in a module-level registry (`atoms` object in `atom.ts`). In a Node process serving multiple concurrent requests, every request shares the same atoms. Request A writing `userAtom.update({ name: "Alice" })` will corrupt Request B's view of the same atom.

`AtomStore` gives each request its own **isolated clone** of every atom template. The template atom itself is never mutated.

## Concepts

| Term | Meaning |
|---|---|
| Template atom | The atom created with `createAtom` at module level. Holds the default. Never mutated directly in SSR. |
| Scoped clone | A per-store copy of a template atom. Created lazily on first `store.use(template)`. Keyed by the template's original key internally; owns its own state and event subscriptions. |
| Snapshot | A plain `Record<string, unknown>` — the current values of every scoped atom in the store. Used to pass server state to the client. |

## Basic SSR pattern

```ts
// state.ts — shared module (template atoms)
import { createAtom } from "@mongez/atom";

export const userAtom    = createAtom({ key: "user",    default: { name: "Anon", loggedIn: false } });
export const cartAtom    = createAtom({ key: "cart",    default: [] });
export const localeAtom  = createAtom({ key: "locale",  default: "en" });
```

```ts
// server.ts — per-request handler
import { createAtomStore } from "@mongez/atom";
import { userAtom, cartAtom, localeAtom } from "./state";

async function handleRequest(req, res) {
  const store = createAtomStore();

  try {
    // Get request-scoped clones. The template atoms are untouched.
    const user   = store.use(userAtom);
    const locale = store.use(localeAtom);

    user.update({ name: req.user.name, loggedIn: true });
    locale.update(req.headers["accept-language"]?.slice(0, 2) ?? "en");

    // Render your app — pass `store` via context so components call
    // store.use(atom) instead of reading the template directly.
    const html = renderApp(store);

    // Serialize current store state to embed in the HTML response.
    const snapshot = store.snapshot();

    res.send(buildHtml(html, snapshot));
  } finally {
    // CRITICAL: destroy the store after every request to release
    // event-bus subscriptions and allow GC.
    store.destroy();
  }
}
```

## API reference

### createAtomStore / new AtomStore

```ts
import { createAtomStore, AtomStore } from "@mongez/atom";

const store = createAtomStore();   // convenience factory, same as new AtomStore()
```

### store.use(template)

Lazily creates a scoped clone of `template`. Second call with the same template returns the existing clone.

```ts
const scopedUser = store.use(userAtom);
// scopedUser is a full Atom<User> — update, merge, onChange, etc. all work.
scopedUser.update({ name: "Alice", loggedIn: true });

// The template is untouched:
userAtom.value;   // { name: "Anon", loggedIn: false }
```

### store.get(key)

Look up an already-created scoped atom by its original key. Returns `undefined` if `use()` has not been called for that key yet.

```ts
store.get("user")?.value;   // { name: "Alice", loggedIn: true }
store.get("never-used");    // undefined
```

### store.has(key)

```ts
store.has("user");   // true after store.use(userAtom)
```

### store.list()

All scoped atoms currently in this store (in insertion order).

```ts
store.list();   // [scopedUserAtom, scopedLocaleAtom]
```

### store.hydrate(snapshot)

Apply a snapshot of initial values. Atoms already in the store are updated immediately; atoms not yet registered have their values queued and applied on the next `use(template)` call.

```ts
// Server receives client-provided initial values (e.g. SSR rehydration from cookies)
store.hydrate({
  "locale": "fr",
  "ui.theme": "dark",
});

// Later, when the atom is accessed:
const locale = store.use(localeAtom);
locale.value;   // "fr"  (the queued value was applied)
```

### store.snapshot()

Serialize current scoped atom values to a plain object. Use for embedding in SSR HTML or passing as `initialValues` to `<AtomStoreProvider>`.

```ts
const snapshot = store.snapshot();
// { "user": { name: "Alice", loggedIn: true }, "locale": "en" }

// Embed in HTML for client hydration:
const html = `<script>window.__ATOM_SNAPSHOT__ = ${JSON.stringify(snapshot)}</script>`;
```

### store.destroy()

Destroys every scoped clone and clears the store. Must be called at the end of each request to prevent event-bus subscription leaks.

```ts
store.destroy();
```

## Next.js App Router example

```ts
// lib/atom-store.ts
import { createAtomStore } from "@mongez/atom";
import { cache } from "react";

// React's `cache()` gives each Server Component tree its own store instance.
export const getRequestStore = cache(() => createAtomStore());
```

```ts
// app/page.tsx (Server Component)
import { getRequestStore } from "@/lib/atom-store";
import { userAtom } from "@/state";
import { cookies } from "next/headers";

export default async function Page() {
  const store = getRequestStore();
  const user  = store.use(userAtom);

  const session = cookies().get("session")?.value;
  if (session) {
    user.update(JSON.parse(session));
  }

  // Pass snapshot to client component for hydration:
  const snapshot = store.snapshot();
  return <ClientRoot initialValues={snapshot} />;
}
```

```tsx
// components/ClientRoot.tsx  ("use client")
// In @mongez/react-atom:
import { AtomStoreProvider } from "@mongez/react-atom";

export function ClientRoot({ initialValues, children }) {
  return (
    <AtomStoreProvider initialValues={initialValues}>
      {children}
    </AtomStoreProvider>
  );
}
```

## Multiple stores (multi-tenant / parallel rendering)

You can create as many stores as needed. Each is fully independent:

```ts
const storeA = createAtomStore();
const storeB = createAtomStore();

storeA.use(userAtom).update({ name: "Alice", loggedIn: true });
storeB.use(userAtom).update({ name: "Bob",   loggedIn: true });

storeA.get("user")?.value;   // { name: "Alice" }
storeB.get("user")?.value;   // { name: "Bob" }
userAtom.value;              // { name: "Anon" }  — template untouched
```

## Key pitfalls

- **Always call `store.destroy()` after each request.** Scoped clones subscribe to the `@mongez/events` bus. Failing to destroy creates an event-listener leak that grows with traffic.
- **`store.use(template)` is lazy.** If a component reads `userAtom.value` directly (template, not `store.use(userAtom)`) on the server, it gets the global default, not the request-scoped value. All server-side reads must go through `store.use()`.
- **`store.hydrate()` queues values for atoms not yet used.** If you call `hydrate` before any `use()`, values are staged. They are applied the first time the corresponding `use(template)` is called. Order of operations does not matter.
- **Clone keys are internal.** A scoped clone's key is `${original.key}.clone.N`. The store indexes it by the **original key** (`template.key`), so `store.get("user")` works even though the clone's `.key` property is different.
- **Do not use `persist: true` with scoped atoms.** The built-in localStorage adapter no-ops on the server, but a custom async adapter on a scoped atom would write per-request data to a shared store keyed by the clone's suffixed key. If you need SSR-safe persistence, apply it to the template and use a cookie adapter that reads from `req.cookies`.
