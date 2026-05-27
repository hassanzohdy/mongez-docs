---
title: "Recipes"
name: mongez-atom-recipes
description: |
  Idiomatic composition recipes for `@mongez/atom` covering boolean toggles, cart totals, derived watch patterns, SSR hydration, DevTools teardown, and scratch atoms.
  TRIGGER when: code combines several of `createAtom`, `atomCollection`, `derive`, `createAtomStore`, `enableAtomDevtools`, `onChange`, `watch` in one place; user asks "give me a real-world example", "show me an end-to-end SSR snapshot + hydrate pattern", "build a cart with computed totals", "how do I tear down `enableAtomDevtools` on HMR", or "how do I derive state into another atom via `onChange`"; `import { createAtom, atomCollection, derive, createAtomStore, enableAtomDevtools } from "@mongez/atom"` together.
  SKIP: single-feature deep dives — route to the focused skill instead (`mongez-atom-atoms`, `mongez-atom-collections`, `mongez-atom-derived`, `mongez-atom-persist`, `mongez-atom-atom-store`, `mongez-atom-devtools`, `mongez-atom-actions`); React-specific composition (lives in `@mongez/react-atom`); query/cache patterns (use `@mongez/atomic-query`).
sidebar:
  order: 99
---

Idiomatic compositions across `@mongez/atom` features.

## A boolean toggle with verbs

```ts
const sidebar = createAtom({
  key: "ui.sidebar",
  default: false,
  actions: {
    open()   { this.update(true); },
    close()  { this.update(false); },
    toggle() { this.update(!this.value); },
  },
});

sidebar.toggle();
```

## A cart with computed totals

```ts
type Item = { id: string; price: number; qty: number };

const cart = atomCollection<Item>({
  key: "cart",
  actions: {
    get total() {
      return this.value.reduce((s, i) => s + i.price * i.qty, 0);
    },
    setQty(this: Atom<Item[]>, id: string, qty: number) {
      this.update(this.value.map(i => i.id === id ? { ...i, qty } : i));
    },
  },
});

cart.push({ id: "a", price: 10, qty: 2 });
cart.push({ id: "b", price: 5, qty: 1 });
cart.total;  // 25
cart.setQty("a", 3);
cart.total;  // 35
```

## Side effect via `onChange`

When you need a side effect on every change (writing to another atom, logging, hitting an API) rather than a pure derivation, subscribe via `onChange`. For pure computed values, prefer `derive` (see `mongez-atom-derived`).

```ts
const inputAtom = createAtom({ key: "search.input", default: "" });
const querySlugAtom = createAtom({ key: "search.slug", default: "" });

inputAtom.onChange(next => {
  querySlugAtom.update(next.toLowerCase().trim().replace(/\s+/g, "-"));
});
```

## SSR snapshot + hydrate

```ts
// Server
const store = createAtomStore();
store.use(userAtom).update({ name: "Alice" });
const html = renderToString(<App store={store} />);
const payload = JSON.stringify(store.snapshot());
res.send(/* html with payload embedded as <script> */);
store.destroy();
```

```ts
// Client
const incoming = JSON.parse(document.getElementById("__atoms")!.textContent!);
const store = createAtomStore();
store.hydrate(incoming);
// Mount the React tree with this store via AtomStoreProvider.
```

## Devtools in dev only

```ts
let teardownDevtools: (() => void) | undefined;
if (process.env.NODE_ENV !== "production") {
  teardownDevtools = enableAtomDevtools({
    name: "MyApp",
    ignore: [/^mouse\./, /^perf\./],
  });
}

// HMR cleanup (Vite / Webpack)
if ((import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => teardownDevtools?.());
}
```

## A throwaway scratch atom

If you need state but don't care about the key:

```ts
const scratch = createAtom({
  key: `scratch.${Math.random()}`,
  default: { x: 0, y: 0 },
});
// Clean up before forgetting about it:
scratch.destroy();
```

For long-lived ad-hoc atoms, give them a deterministic key — the registry is shared per process.
