---
title: Get started with @mongez/atom
description: Install, the 30-second tour, and where to go next.
sidebar:
  order: 1
---

`@mongez/atom` is the framework-agnostic core of the Mongez state-management family. An atom is a typed value with **action methods bound to it** — so you call domain verbs (`cartAtom.push(item)`, `authAtom.login(creds)`, `modalAtom.open()`) instead of writing setters and helper functions everywhere.

> **Naming convention**: suffix atom variables with `Atom` (e.g. `counterAtom`, `sidebarAtom`). This prevents conflicts with component props, local values, and imported helpers that share the same concept name.

## Install

```sh
yarn add @mongez/atom
# peer deps: @mongez/events, @mongez/reinforcements
```

If you're on React, add the adapter too:

```sh
yarn add @mongez/react-atom
```

## 30-second tour

```ts
import { createAtom, atomCollection, derive } from "@mongez/atom";

// A boolean toggle with verbs
const sidebarAtom = createAtom({
  key: "ui.sidebar",
  default: false,
  actions: {
    open()   { this.update(true); },
    close()  { this.update(false); },
    toggle() { this.update(!this.value); },
  },
});

sidebarAtom.toggle();

// A list with built-in mutation helpers
type Todo = { id: number; text: string; done: boolean };
const todosAtom = atomCollection<Todo>({ key: "todos", default: [] });
todosAtom.push({ id: 1, text: "Buy bread", done: false });
todosAtom.remove(t => t.done);

// A derived atom — auto-tracks its dependencies
const incompleteTodosAtom = derive("todos.incomplete", get =>
  get(todosAtom).filter(t => !t.done).length,
);

incompleteTodosAtom.value;             // 1
todosAtom.push({ id: 2, text: "Read book", done: false });
incompleteTodosAtom.value;             // 2  (recomputes automatically)
```

## Where to go next

- [Overview](../overview/) — pitch, install, mental model, scope vs siblings.
- [Atoms](../atoms/) — `createAtom`, methods, options (`beforeUpdate`, `onUpdate`, `get`), the conditional-type split.
- [Atom collections](../collections/) — `atomCollection` for arrays + mutation verbs.
- [Derived atoms](../derived/) — auto-tracked computed values, dynamic dep graphs.
- [Persistence](../persist/) — `persist: true` (localStorage) or any custom `PersistAdapter`.
- [Atom stores (SSR)](../stores/) — `AtomStore`, per-request isolation.
- [Actions](../actions/) — the action bag, `this` binding, getters as properties.
- [Devtools](../devtools/) — Redux DevTools bridge with time-travel.
- [Recipes](../recipes/) — cross-feature compositions.

## React integration

For React projects, the adapter is [`@mongez/react-atom`](/react-atom/getting-started/). It adds per-atom hooks, `<AtomStoreProvider>` for SSR scoping, and preset atoms for the common 80% (toggles, loading flags, fetch lifecycles, modal coordinators).

## Server data caching

For server data with invalidation/refetch/optimistic updates, see [`@mongez/atomic-query`](/atomic-query/getting-started/). It's the React Query–style cache built on `@mongez/react-atom`.

## License

MIT.
