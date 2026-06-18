---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[6.0.9]</span> <span class="cl-date">2026-05-27</span> <span class="cl-counts">Fixed (8) · Added (8) · Changed (5) · Removed (2) · Dependency bumps (1)</span></summary>

### Fixed

- **Watcher leak / wrong-removal in `atom.watch(key, cb)`**. The unsubscribe captured an index from the subscription site, and that index drifted as earlier callbacks unsubscribed — splicing the wrong (or out-of-range) callback. Unsubscribe is now identity-based: it removes the callback by reference.
- **Watcher diff used the raw `newValue` argument**. When callers passed an updater function to `update(...)`, the watcher comparison ran `get(newValue, key)` on the function itself, so every watcher fired (or none did) regardless of what changed. Now uses the resolved `updatedValue`.
- **`reset()` returned dead code**. The function assigned `const update = this.update(...)` (returns `void`) and then `return update`. The local was always `undefined`. Removed.
- **`reset()` didn't deep-clone the default**. After the first `update` that mutated `currentValue`, subsequent `reset()` calls handed callers a reference into shared default state. Now clones via `@mongez/reinforcements`' `clone`.
- **`clone()` collisions on heavy use**. The 4-digit `Random.int(1000, 9999)` suffix collided in birthday-paradox territory after a few thousand clones. Replaced with a monotonic counter (`.clone.1`, `.clone.2`, …).
- **`get(key)` auto-bound any function-valued property**. Every function has a `.bind`, so the implementation rebound *every* function returned from `get()` to `this.currentValue`. That broke pre-bound methods and generated a new function identity per read. Removed entirely.
- **`change` / `silentChange` on primitive atoms silently corrupted state**. Calling `atom.change("foo", "bar")` on a `boolean` atom spread the primitive (`{...true, foo: "bar"}` → `{foo: "bar"}`) and replaced the boolean with an object. Now a compile error at the type level (see "Changed").
- **Getter-based actions crashed `createAtom`**. `Object.keys(actions).forEach(k => actions[k].bind(atom))` invoked any getter eagerly; if the getter referenced `this.value` (which wasn't on the atom yet) it returned `undefined`, and `.bind` blew up. The action installer now uses `Object.getOwnPropertyDescriptor` and forwards getters as getters.

### Added

- **`derive(key, get => …)`** — derived atoms with auto-tracked dependencies. The compute function runs eagerly on creation and on every dependency change. Dynamic dependency graphs are supported (conditional reads add/drop deps across runs). Errors inside `compute` are surfaced asynchronously without breaking the source atom's update cycle.
- **`persist: true | PersistAdapter`** — atom-level persistence. `true` uses the built-in localStorage adapter (no-ops on the server); a `PersistAdapter` object lets you plug in cookies, IndexedDB, `@mongez/cache`, etc. The adapter is called for the initial read (sync or async), every update writes through, and `reset()` removes the entry. Sync errors and async rejections from the adapter are swallowed — a transient storage error (quota, private-mode block) never crashes the atom.
- **`AtomStore` + `createAtomStore`**. Per-request isolation primitive for SSR. Each store holds scoped clones of atom templates, exposes `use(template)`, `get(key)`, `hydrate(snapshot)`, `snapshot()`, and `destroy()`. The React-side glue (`AtomStoreProvider`, `useAtom`, `useAtomStore`) lives in `@mongez/react-atom`.
- **`clone({ register: false })` option**. Lets the store create scoped clones without polluting the module-level `atoms` registry.
- **`enableAtomDevtools(options?)`**. Redux DevTools bridge with initial-snapshot, per-update timeline entries, `JUMP_TO_STATE` / `JUMP_TO_ACTION` time-travel via `silentUpdate`, ignore-patterns, configurable scan interval for late-registered atoms.
- **AI kit**. `llms.txt`, `llms-full.txt`, and `skills/` folder (`README`, `overview`, `atoms`, `collections`, `stores`, `actions`, `devtools`, `recipes`) for tool-assisted development.
- **Test suite**. 52 unit tests across `atom`, `atom-collection`, `atom-store`, and `devtools`.
- **CI**. GitHub Actions workflow: Node 18/20/22 × Ubuntu, plus Node 20 × Windows.

### Changed

- **`Atom<V, A>` is now a conditional type**. Object-only methods (`merge`, `change`, `silentChange`, `get(key)`, `watch(key, cb)`) are removed from the type when `V` is a primitive. `Atom<boolean>.change(...)` is a compile error. `Atom<any>` keeps both surfaces (legacy permissive default).
- **`AtomActions<V>` no longer includes `| any`**. Was `[key: string]: (...) => any | any`. The `| any` collapsed the entire type to `any` and defeated per-action type safety. Now just `(this: Atom<V>, ...args: any[]) => any`.
- **`AtomOptions.default` is `V`, not `V | Partial<V>`**. `Partial<V>` accidentally allowed incomplete defaults that the type didn't reflect at runtime.
- **`change` / `silentChange` signatures are `(key: T, newValue: V[T])`**, not `(key, newValue: any)`. The wider `any` defeated type safety for known-shape atoms.
- **`clone()` accepts `{ register?: boolean }`**. Pure addition for stores; existing callers (`atom.clone()`) keep working.

### Removed

- **Auto-`bind` in `atom.get(key)`**. Functions returned from `get()` are no longer rebound to `currentValue`. If your code relied on this, wrap the call: `atom.get("fn")?.bind(atom.value)`.
- **Random-suffix clone keys** (`...Cloned9123`). Replaced by deterministic counter (`...clone.1`, `...clone.2`).

### Dependency bumps

- **`@mongez/reinforcements: ^2.3.10` → `^3.1.0`**. Compatible API for the surfaces atom uses (`clone`, `get`). See [reinforcements v3 MIGRATION](../reinforcements/MIGRATION.md) for the full diff.

### Tests

```
46 + 6 devtools + 7 derive + 12 persist = 71 passing
```

</details>
