---
title: "Defining Atoms"
name: mongez-atom-defining-atoms
description: |
  How to create atoms with `createAtom` and `atomCollection` — options, actions, typing, object helpers, and the built-in mutation API.
sidebar:
  order: 50
---

## Install

```sh
yarn add @mongez/atom
# peer deps: @mongez/events @mongez/reinforcements
```

## Basic atom

```ts
import { createAtom } from "@mongez/atom";

const counter = createAtom({
  key: "counter",       // required; must be globally unique
  default: 0,           // required; determines the type of Value
});

counter.value;          // 0
counter.update(5);      // emits update event
counter.update(prev => prev + 1);  // functional update
counter.silentUpdate(0);           // no update event fired
counter.reset();        // back to default (0), emits reset event
counter.silentReset();  // back to default, no update event (reset event still fires)
```

## Typed atoms

`Atom<V>` is a generic. The `default` value drives inference; annotate when the inferred type is too narrow:

```ts
type Theme = "light" | "dark";

const themeAtom = createAtom({
  key: "ui.theme",
  default: "light" as Theme,   // widen "light" to Theme
});

themeAtom.update("dark");   // OK
themeAtom.update("blue");   // compile error
```

For objects:

```ts
type User = { name: string; age: number };

const userAtom = createAtom({
  key: "user",
  default: { name: "Anon", age: 0 } satisfies User,
});
```

## Object-atom helpers (only on Atom<object>)

When `Value` is an object or array, these extra methods exist. Calling them on a primitive atom (`Atom<boolean>`, `Atom<number>`) is a **compile error**.

```ts
const user = createAtom({
  key: "user",
  default: { name: "Anon", role: "viewer" as "viewer" | "admin" },
});

// Shallow merge — triggers update event
user.merge({ role: "admin" });

// Set one key — triggers update event
user.change("name", "Alice");

// Set one key silently — no update event
user.silentChange("name", "Bob");

// Read one key (supports dot-notation via @mongez/reinforcements)
user.get("name");          // "Bob"

// Subscribe to changes on one key only
const sub = user.watch("role", (next, prev) => {
  console.log("role changed from", prev, "to", next);
});
sub.unsubscribe();   // stop watching
```

## Actions (verbs on the atom)

Actions turn an atom into a command object. `this` inside each action is the atom instance.

```ts
import { createAtom, type Atom } from "@mongez/atom";

const sidebar = createAtom({
  key: "ui.sidebar",
  default: false,
  actions: {
    open()   { this.update(true); },
    close()  { this.update(false); },
    toggle() { this.update(!this.value); },
  },
});

sidebar.open();
sidebar.toggle();
sidebar.value;   // false
```

TypeScript infers action types from the `actions` object — no extra type annotations needed for simple cases.

### Actions with arguments

```ts
type CartItem = { id: string; price: number; qty: number };

const cart = createAtom({
  key: "cart",
  default: [] as CartItem[],
  actions: {
    addItem(item: CartItem) {
      this.update([...this.value, item]);
    },
    setQty(id: string, qty: number) {
      this.update(this.value.map(i => i.id === id ? { ...i, qty } : i));
    },
    removeItem(id: string) {
      this.update(this.value.filter(i => i.id !== id));
    },
  },
});

cart.addItem({ id: "a", price: 10, qty: 1 });
cart.setQty("a", 3);
cart.removeItem("a");
```

### Getter actions (computed properties)

Use ES5 property descriptors (`get` keyword inside the `actions` object). These are installed as real getters on the atom instance:

```ts
const cart = createAtom({
  key: "cart2",
  default: [] as CartItem[],
  actions: {
    get total() {
      return this.value.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
  },
});

cart.total;   // number — no () needed
```

## atomCollection — arrays with built-in mutation verbs

Use `atomCollection` instead of `createAtom` when the value is an array. It pre-installs all common mutation helpers:

```ts
import { atomCollection } from "@mongez/atom";

type Todo = { id: number; text: string; done: boolean };

const todos = atomCollection<Todo>({ key: "todos" /* default: [] */ });

todos.push({ id: 1, text: "Buy bread", done: false });
todos.unshift({ id: 0, text: "Wake up", done: true });
todos.pop();                            // removes last
todos.shift();                          // removes first
todos.remove(t => t.done);             // by predicate
todos.remove(2);                        // by index
todos.removeItem(someRef);              // by reference equality
todos.removeAll(someRef);               // all occurrences
todos.replace(0, { id: 0, text: "Wake up EARLY", done: true });
todos.map(t => ({ ...t, done: true })); // maps + updates + triggers event
todos.get(0);                           // get by index
todos.get(t => t.id === 1);            // get by predicate
todos.index(t => t.id === 1);          // findIndex
todos.forEach(t => console.log(t));    // read-only iteration
todos.length;                           // number
todos.value;                            // Todo[]
```

You can still add custom actions alongside the built-in ones:

```ts
const todos2 = atomCollection<Todo>({
  key: "todos2",
  actions: {
    markAllDone() {
      this.update(this.value.map(t => ({ ...t, done: true })));
    },
  },
});
```

## Subscriptions

```ts
const counter = createAtom({ key: "c", default: 0 });

// onChange — fires on every update
const sub = counter.onChange((next, prev, atom) => {
  console.log(next, prev);
});
sub.unsubscribe();

// onReset — fires when reset() or silentReset() is called
counter.onReset(atom => console.log("reset"));

// onDestroy — fires when destroy() is called
counter.onDestroy(atom => console.log("destroyed"));
```

## beforeUpdate hook

Intercept and transform (or reject) every incoming value before it is stored:

```ts
const boundedAngle = createAtom({
  key: "angle",
  default: 0,
  beforeUpdate(next, prev, atom) {
    return ((next % 360) + 360) % 360;  // clamp to [0, 360)
  },
});

boundedAngle.update(450);
boundedAngle.value;   // 90
```

Return `undefined` (or nothing) to let the original value through unchanged.

## Clone and destroy

```ts
const a = createAtom({ key: "original", default: 42 });

const b = a.clone();          // key: "original.clone.1"; registered globally
const c = a.clone({ register: false }); // isolated clone, not in registry

a.destroy();  // removes from registry, triggers delete event, unsubscribes all listeners
```

## Key pitfalls

- `default` must be a **complete** value — no `Partial<V>` defaults. `AtomOptions.default: V`, not `Partial<V>`.
- `update()` short-circuits when `newValue === currentValue` (strict reference equality). Always pass a new object/array reference for object atoms. `merge()` and `change()` do this for you.
- `silentUpdate` still runs `beforeUpdate` — it only suppresses the `update` event emission.
- `reset()` triggers both an `update` event (with the default value) and a `reset` event. `silentReset()` only triggers the `reset` event.
- Actions are bound to the atom with `.bind(atom)` at creation time. Arrow functions in `actions` also work but `this` will be `undefined` — use regular functions so `this` resolves correctly.
- `atomCollection.map()` **mutates and updates** the atom. It is not a read-only `.map()`. Use `todos.value.map(...)` if you only want to read.
