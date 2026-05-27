---
title: "Atom Stores (SSR)"
name: mongez-atom-stores
description: |
  How to use `AtomStore` and `createAtomStore` to isolate per-request atom state in SSR environments and avoid cross-request state leaks.
  TRIGGER when: code imports `AtomStore`, `createAtomStore`, or calls `store.use`, `store.get`, `store.has`, `store.list`, `store.hydrate`, `store.snapshot`, `store.destroy` from `@mongez/atom`; user asks "how do I scope atoms per request in Next.js / Express / Fastify", "how do I avoid SSR state leaks", or "how do I serialize server atom state and rehydrate on the client"; `import { createAtomStore, AtomStore } from "@mongez/atom"`.
  SKIP: defining the template atoms themselves (use `mongez-atom-atoms` / `mongez-atom-defining-atoms`); React-side `AtomStoreProvider` / `useAtomStore` (lives in `@mongez/react-atom`); pure client-only apps with no SSR; the sibling `mongez-atom-atom-store` skill — only one of the two should fire for the same request.
sidebar:
  order: 70
---

The module-level `atoms` registry is shared per Node process. In an SSR context, two concurrent requests would write to the same atoms and see each other's state. `AtomStore` solves this by giving each request its own bag of scoped atom clones.

## Why

```ts
// app/users/page.tsx (Next.js server component)
const userAtom = createAtom({ key: "auth.user", default: { name: "Anon" } });

// During Request A
userAtom.update({ name: "Alice" });

// During Request B (concurrent), reading userAtom.value sees "Alice".
// That's a cross-request leak — the bug that AtomStore exists to fix.
```

## Usage

```ts
import { AtomStore, createAtomStore } from "@mongez/atom";

const store = createAtomStore();   // or new AtomStore()

// Lazily clones the original atom on first access.
const scopedUser = store.use(userAtom);
scopedUser.update({ name: "Alice" });    // only this store sees it
userAtom.value;                          // still { name: "Anon" }
```

## API

```ts
class AtomStore {
  use<V, A>(template: Atom<V, A>): Atom<V, A>;
  get<V>(key: string): Atom<V> | undefined;
  has(key: string): boolean;
  list(): Atom<any>[];
  hydrate(snapshot: Record<string, unknown>): void;
  snapshot(): Record<string, unknown>;
  destroy(): void;
}
```

- `use(template)` → returns the scoped clone, creating it lazily.
- `hydrate(snapshot)` → seeds values for atoms that may not have been accessed yet. Pending values are applied when the atom first enters the store.
- `snapshot()` → serializable record of every scoped atom's current value.
- `destroy()` → unsubscribes events for every scoped atom and clears the store. Always call at the end of a request lifecycle.

## React integration

The hook-side wiring lives in [`@mongez/react-atom`](https://github.com/hassanzohdy/mongez-react-atom): `<AtomStoreProvider>`, `useAtom(template | key)`, `useAtomStore()`. See its `skills/stores.md`.

## Server-side hand-off pattern

```ts
// Server (Express, Fastify, or any framework middleware)
import { createAtomStore } from "@mongez/atom";

app.get("/users", async (req, res) => {
  const store = createAtomStore();
  store.hydrate({ "auth.user": req.user });   // pre-seed from cookies/headers
  try {
    // Render with `store` made available via React context.
    const html = renderToString(<AppShell store={store} />);
    const payload = JSON.stringify(store.snapshot());
    res.send(/* HTML + embedded payload */);
  } finally {
    store.destroy();
  }
});
```
