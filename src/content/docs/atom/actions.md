---
title: "Actions"
name: mongez-atom-actions
description: |
  How to define function actions, property getters, and plain values in the `actions` bag passed to `createAtom` or `atomCollection`, with `this` bound to the atom instance.
  TRIGGER when: code defines an `actions` object on `createAtom` or `atomCollection`, uses `ThisType<Atom<V, A>>`, or declares `get total()` / `get isEmpty()` style getters; user asks "how do I add methods to an atom", "how do I use `this` inside an action", or "how do I add a computed getter"; file uses `this.update(...)` / `this.merge(...)` inside a `createAtom` actions block.
  SKIP: defining the atom itself (use `mongez-atom-defining-atoms` or `mongez-atom-atoms`); array-specialized verbs like `push`/`pop`/`remove` (use `mongez-atom-collections`); React hook patterns like `useValue` / `useState` (those live in `@mongez/react-atom`, not this package).
sidebar:
  order: 60
---

The `actions` bag passed to `createAtom` becomes part of the atom's method surface. Two kinds of entries are supported.

## Functions

Plain function values get bound to the atom instance, so `this` inside them refers to the atom.

```ts
const counter = createAtom({
  key: "counter",
  default: 0,
  actions: {
    increment() {
      this.update(this.value + 1);   // `this` is Atom<number, ...>
    },
    addAndReturn(n: number) {
      this.update(this.value + n);
      return this.value;
    },
  },
});

counter.increment();
const next = counter.addAndReturn(5);
```

### Typing `this` explicitly

If TypeScript can't infer `this` (rare in practice), spell it out:

```ts
actions: {
  toggle(this: Atom<boolean>) {
    this.update(!this.value);
  },
}
```

The `ThisType<Atom<V, A>>` in the options helps inference in most cases.

## Property getters

A getter on the actions object becomes a getter on the atom. Useful for derived properties.

```ts
const cart = atomCollection<Item>({
  key: "cart",
  actions: {
    get total() {
      return this.value.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    get isEmpty() {
      return this.value.length === 0;
    },
  },
});

cart.total;    // recomputed on each read
cart.isEmpty;
```

Getters are forwarded as property getters on the atom — calling `.bind` on them (which the action-installation loop does for functions) would invoke the getter prematurely and crash. The implementation detects descriptors and routes them correctly.

## Plain values

Non-function, non-getter values are copied through as-is:

```ts
actions: {
  MAX_SIZE: 100,
  DEFAULT_OPTIONS: { foo: true },
}
```

These show up as plain properties on the atom; modifying them at runtime is allowed but not observed by the event bus.

## Patterns the React layer builds on

`@mongez/react-atom` uses this same actions mechanism to attach React-specific methods to every atom it creates:

- `atom.useValue()` — a hook returning the current value (via `useSyncExternalStore`).
- `atom.useState()` — `[value, setValue]` tuple.
- `atom.use(key)` — fine-grained subscription to one key.
- `atom.useWatch(key, cb)` — effect wrapper.
- `atom.Provider` — a React component that pushes a value into the atom on mount.

You can build the same pattern for your own framework — Vue composables, Solid signals, etc. The actions are just bound methods.
