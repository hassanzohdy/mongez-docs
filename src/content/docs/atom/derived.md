---
title: "Derived atoms"
name: mongez-atom-derived
description: |
  How to create computed atoms with `derive()` — auto-tracked dependencies, dynamic dep graphs, chaining, and React consumption.
  TRIGGER when: code imports or calls `derive`, uses `DeriveGetter` / `DeriveOptions` types, or builds a value from other atoms via a `get` argument; user asks "how do I create a computed/derived atom", "how do I auto-track atom dependencies", or "how do I chain derived atoms"; `import { derive } from "@mongez/atom"`.
  SKIP: writable base atoms (use `mongez-atom-atoms` / `mongez-atom-defining-atoms`); array verbs over a collection (use `mongez-atom-collections`); React-side `useValue` / `useState` wiring (lives in `@mongez/react-atom`); the sibling `mongez-atom-derived-atoms` skill — only one of the two should fire for the same request.
sidebar:
  order: 40
---

`derive(key, compute)` creates a computed atom whose value is built from other atoms. Dependencies are tracked automatically: whichever atoms the `compute` function reads via its `get` argument become dependencies. When any of them change, the derived atom recomputes and notifies its own subscribers.

## Signature

```ts
function derive<T>(
  key: string,
  compute: (get: DeriveGetter) => T,
  options?: { register?: boolean },
): Atom<T>

type DeriveGetter = <V>(atom: Atom<V, any>) => V;
```

The returned atom is a normal `Atom<T>` — every consumer pattern from `@mongez/react-atom` (`useValue`, `useState`, `use(key)`, `useWatch`, etc.) and from the core (`onChange`, `watch`, `destroy`) works on it.

## Behavior

- **Eager initial compute.** The function runs once on creation to seed the value and discover the first set of dependencies.
- **Eager recompute.** When any tracked dependency changes (via `update` / `change` / `merge`), the function runs again and the result is pushed through the atom's normal `update` flow — every subscriber re-renders.
- **Dynamic dependency graph.** Conditional reads (`if (get(branch) === "a") return get(a); else return get(b);`) work correctly. After each recompute the engine diffs the new dep set against the old one, unsubscribes from atoms no longer read, and subscribes to newly-seen ones.
- **Chaining propagates.** A derived atom can be a dependency of another derived atom. Updates fan out through the chain.
- **Error isolation.** If `compute` throws, the previous value is kept and the error is surfaced asynchronously (via a microtask re-throw) so the source atom's update cycle isn't broken.
- **Destroy unsubscribes deps.** `derivedAtom.destroy()` drops every dependency subscription before clearing the registry entry.

## Examples

### Simple

```ts
const firstName = createAtom({ key: "first", default: "Ada" });
const lastName  = createAtom({ key: "last",  default: "Lovelace" });

const fullName = derive("fullName", get => `${get(firstName)} ${get(lastName)}`);

fullName.value;            // "Ada Lovelace"
firstName.update("Grace");
fullName.value;            // "Grace Lovelace"
```

### Filtered view

```ts
type Todo = { id: number; text: string; done: boolean };

const todos = atomCollection<Todo>({ key: "todos" });
const filter = createAtom({ key: "filter", default: "all" as "all" | "active" | "done" });

const visible = derive("visible-todos", get => {
  const f = get(filter);
  const list = get(todos);
  if (f === "active") return list.filter(t => !t.done);
  if (f === "done")   return list.filter(t => t.done);
  return list;
});
```

### Cross-atom gate (the killer use case)

```ts
const canCheckout = derive("canCheckout", get =>
  get(cart).length > 0 &&
  get(userAtom).loggedIn &&
  !get(checkoutLoading).isLoading,
);

if (canCheckout.value) {
  // safe to show the button
}
```

### Conditional reads (dynamic dep graph)

```ts
const branch = createAtom({ key: "branch", default: "a" as "a" | "b" });
const a = createAtom({ key: "av", default: "from-a" });
const b = createAtom({ key: "bv", default: "from-b" });

const selected = derive("selected", get =>
  get(branch) === "a" ? get(a) : get(b),
);

// Updating `b` doesn't recompute while branch === "a" — b isn't a tracked dep.
b.update("changed");        // selected.value still "from-a"

branch.update("b");          // dependency set flips; selected.value now reads b
b.update("changed-again");   // recomputes; selected.value → "changed-again"
```

### Chained derivations

```ts
const a = createAtom({ key: "a", default: 2 });
const doubled    = derive("doubled",    get => get(a) * 2);
const quadrupled = derive("quadrupled", get => get(doubled) * 2);

a.update(5);
doubled.value;     // 10
quadrupled.value;  // 20
```

## React consumption

Through `@mongez/react-atom`, derived atoms get the same hooks as any other atom:

```tsx
function Counter() {
  const count = quadrupled.useValue();   // re-renders when quadrupled changes
  return <span>{count}</span>;
}
```

For object-valued derived atoms, `use(key)` still works to scope subscription to one field.

## Gotchas

- **Don't write to derived atoms.** Calling `update` / `merge` / `change` on the returned atom works, but the next dependency change will overwrite your write. If you need writable state, use a regular atom.
- **Don't depend on yourself.** A derive that reads its own atom inside `compute` creates an infinite loop. The engine doesn't detect cycles — keep dependency graphs acyclic.
- **Throws are asynchronous.** Errors inside `compute` are caught and re-thrown in a microtask so the upstream update cycle isn't broken. Catch them with a `process.on("uncaughtException")` handler or browser `window.onerror` if you need to log them centrally.
