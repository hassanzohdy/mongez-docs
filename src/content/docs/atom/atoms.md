---
title: "Atoms"
name: mongez-atom-atoms
description: |
  Full reference for `createAtom` — signature, base methods, object-only methods, lifecycle events, registry helpers, and usage examples.
  TRIGGER when: code imports or calls `createAtom`, `getAtom`, `atomsList`, `atomsObject`, or uses `atom.update`, `atom.silentUpdate`, `atom.merge`, `atom.change`, `atom.silentChange`, `atom.watch`, `atom.reset`, `atom.silentReset`, `atom.onChange`, `atom.onReset`, `atom.onDestroy`, `atom.clone`, `atom.destroy`, `beforeUpdate`; user asks "how do I define an atom", "what methods does an atom have", or "how do I subscribe to atom changes"; `import { createAtom } from "@mongez/atom"`.
  SKIP: array-typed atom mutation verbs (use `mongez-atom-collections`); computed atoms (use `mongez-atom-derived` / `mongez-atom-derived-atoms`); attaching custom methods via `actions` bag (use `mongez-atom-actions`); SSR isolation (use `mongez-atom-atom-store` / `mongez-atom-stores`); persistence (use `mongez-atom-persist` / `mongez-atom-persistence`); React hooks (live in `@mongez/react-atom`).
sidebar:
  order: 20
---

The flagship export: `createAtom(options)`.

## Signature

```ts
createAtom<Value, Actions>(options: AtomOptions<Value, Actions>): Atom<Value, Actions>
```

```ts
type AtomOptions<V, A> = {
  key: string;
  default: V;
  actions?: A & ThisType<Atom<V, A>>;
  beforeUpdate?: (next: V, prev: V, atom: Atom<V, A>) => V | void;
  onUpdate?: (callback: AtomChangeCallback<V, A>) => EventSubscription;
  get?: (key: string, defaultValue?: V, atomValue?: V) => V;
  persist?: PersistOption<V>;
};
```

## Base methods (always present)

| Method | Description |
|---|---|
| `atom.key` | The unique key passed to `createAtom`. |
| `atom.value` | Current value (getter). |
| `atom.defaultValue` | The initial default (getter, never mutates). |
| `atom.currentValue` | Same as `value` but a plain property — exposed for hot-paths. |
| `atom.update(next \| (prev, atom) => next)` | Set the value and emit an update event. Updater function is supported. |
| `atom.silentUpdate(next)` | Set the value WITHOUT emitting the update event. Used for hydration / time-travel. |
| `atom.reset()` | Restore `default`. Emits both update + reset events. |
| `atom.silentReset()` | Restore default without emitting update; still emits reset. |
| `atom.onChange(cb)` | Subscribe to updates. Returns `{ unsubscribe }`. |
| `atom.onReset(cb)` / `atom.onDestroy(cb)` | Specific lifecycle hooks. |
| `atom.clone({ register?: boolean })` | Deep-clone into a new atom with key `${key}.clone.{n}`. Pass `register: false` to skip the global registry — used internally by `AtomStore`. |
| `atom.destroy()` | Remove from the registry, unsubscribe namespace events. |
| `atom.type` | `"object" \| "array" \| typeof primitive` — set at construction time. |
| `atom.length` | When the value is an array/string. |

## Object-only methods (conditional)

These exist only when `V` is an object or array — `Atom<boolean>` does not carry them.

| Method | Description |
|---|---|
| `atom.merge(partial)` | Shallow merge into the value, emit update. |
| `atom.change(key, value)` | Set one own property of the value, emit update. |
| `atom.silentChange(key, value)` | Same without emitting update. |
| `atom.get(key, default?)` | Read one own property (or via custom `get(...)` if provided). |
| `atom.watch(key, cb)` | Subscribe to changes of a single key. Returns `{ unsubscribe }`. |

## Lifecycle events (via `@mongez/events`)

Events are namespaced as `atoms.${key}.${type}`:

- `atoms.${key}.update` — fired by `update`/`change`/`merge`.
- `atoms.${key}.reset` — fired by `reset`/`silentReset`.
- `atoms.${key}.delete` — fired by `destroy`.

Namespace matching is segment-aware, so destroying `users.1` does NOT also destroy `users.10`.

## Examples

### Primitive atom with action verbs

```ts
const counter = createAtom({
  key: "counter",
  default: 0,
  actions: {
    increment() { this.update(this.value + 1); },
    decrement() { this.update(this.value - 1); },
    addTen()    { this.update(prev => prev + 10); },
  },
});

counter.increment();
counter.value; // 1
```

### Object atom with watch + merge

```ts
const user = createAtom({
  key: "auth.user",
  default: { name: "Anon", lastSeen: 0 },
});

user.watch("name", (next, prev) => console.log(`Name: ${prev} → ${next}`));
user.merge({ name: "Alice" });
// "Name: Anon → Alice"
```

### `beforeUpdate` validator

```ts
const port = createAtom({
  key: "config.port",
  default: 3000,
  beforeUpdate(next) {
    if (next < 1 || next > 65535) return; // void = keep next
    return Math.floor(next);
  },
});
port.update(8443.7);  // value becomes 8443
port.update(999999);  // ignored, stays 8443
```

### Registry helpers

```ts
getAtom("auth.user");           // Atom | undefined
atomsList();                    // Atom[]
atomsObject();                  // Record<string, Atom>
```
