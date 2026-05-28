---
title: "Derived Atoms"
name: mongez-atom-derived-atoms
description: |
  How to create computed atoms with `derive()` — auto-tracked dependencies, conditional reads, chained derivations, and cleanup.
sidebar:
  order: 50
---

## What derive() does

`derive(key, compute)` creates a normal `Atom<T>` whose value is produced by a pure compute function. The function receives a `get` helper; any atom read through `get` becomes a tracked dependency. When any dependency changes, the compute function re-runs and the derived atom's value updates automatically.

The returned atom is a full `Atom<T>` — you can subscribe to it with `onChange`, read `.value`, use it in React with `useValue(derived)`, even chain it into another `derive`.

## Basic example

```ts
import { createAtom, derive } from "@mongez/atom";

const firstName = createAtom({ key: "first", default: "Ada" });
const lastName  = createAtom({ key: "last",  default: "Lovelace" });

const fullName = derive("fullName", get =>
  `${get(firstName)} ${get(lastName)}`
);

fullName.value;               // "Ada Lovelace"
firstName.update("Grace");
fullName.value;               // "Grace Lovelace"
```

## Multiple sources

```ts
const priceAtom   = createAtom({ key: "price",   default: 100 });
const quantityAtom = createAtom({ key: "quantity", default: 3   });
const taxRateAtom  = createAtom({ key: "taxRate",  default: 0.1  });

const totalAtom = derive("total", get => {
  const subtotal = get(priceAtom) * get(quantityAtom);
  return subtotal * (1 + get(taxRateAtom));
});

totalAtom.value;   // 330
quantityAtom.update(5);
totalAtom.value;   // 550
```

## Conditional reads — dynamic dependency graph

The dependency set is re-evaluated on every run. Branches that are not taken on a given run do not create a subscription for that run:

```ts
const branch = createAtom({
  key: "branch",
  default: "first" as "first" | "last",
});

const selected = derive("selected", get =>
  get(branch) === "first" ? get(firstName) : get(lastName)
);

selected.value;           // "Grace"  (reads firstName)
branch.update("last");
selected.value;           // "Lovelace"  (now reads lastName, dropped firstName dep)
```

When `branch` flips to `"last"`, `selected` unsubscribes from `firstName` and subscribes to `lastName`. Memory-safe: no stale subscriptions accumulate.

## Chaining derivations

A derived atom that reads another derived atom recomputes when either level changes:

```ts
const cartAtom   = atomCollection<{ price: number; qty: number }>({ key: "cart3" });
const promoAtom  = createAtom({ key: "promo", default: 0 });

const subtotal = derive("subtotal", get =>
  get(cartAtom).reduce((s, i) => s + i.price * i.qty, 0)
);

const finalPrice = derive("finalPrice", get =>
  get(subtotal) * (1 - get(promoAtom))
);

cartAtom.push({ price: 50, qty: 2 });
finalPrice.value;    // 100
promoAtom.update(0.2);
finalPrice.value;    // 80
```

## Subscribing to a derived atom

Derived atoms are normal `Atom<T>` instances; all subscription APIs work:

```ts
const sub = fullName.onChange((next, prev) => {
  console.log("Name changed:", next);
});
sub.unsubscribe();

// In @mongez/react-atom:
// const name = useValue(fullName);
```

## Cleanup / destroying a derived atom

When you `destroy()` a derived atom, it automatically unsubscribes from all tracked dependencies. No manual cleanup is needed:

```ts
fullName.destroy();
// All dependency subscriptions (firstName, lastName) are released.
```

## Signature reference

```ts
function derive<T>(
  key: string,
  compute: (get: DeriveGetter) => T,
  options?: { register?: boolean },  // false = skip global registry
): Atom<T>;

// DeriveGetter:
type DeriveGetter = <V>(atom: Atom<V, any>) => V;
```

## Key pitfalls

- **Never write to a derived atom directly.** `derivedAtom.update(x)` works at runtime but the next dependency change will overwrite it. Use a regular `createAtom` if you need writable state.
- **Object return values always re-trigger** because the compute function builds a new object reference every call. For primitives, the atom's `update()` short-circuits on `===` equality — so `derive("flag", get => get(a) > 0)` will only notify subscribers when the boolean value actually changes.
- **Errors in compute are surfaced asynchronously** via `queueMicrotask`. The atom keeps its previous value on error. This prevents one broken derivation from crashing the source atom's update cycle — but errors may appear in the console later than expected.
- **Keys must be unique** just like any atom key. Use a namespaced key: `"cart.totalPrice"` not just `"total"`.
- **Initial computation is eager.** `derive(...)` runs the compute function once immediately on creation. If a dependency atom doesn't exist yet at that moment, it will be `undefined`. Register all source atoms before their derived counterparts.
