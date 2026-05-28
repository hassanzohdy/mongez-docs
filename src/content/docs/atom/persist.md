---
title: "Persistence"
name: mongez-atom-persist
description: |
  How to persist atom values using the built-in `localStorageAdapter` or a custom `PersistAdapter` (cookies, IndexedDB, `@mongez/cache`, or any async store).
sidebar:
  order: 50
---

Atoms can persist their value to any store-shaped object — localStorage, cookies, IndexedDB, `@mongez/cache`, a remote backend, whatever. Set `persist` in the atom options; the rest is automatic.

## Signature

```ts
type PersistAdapter<V = unknown> = {
  get(key: string): V | undefined | Promise<V | undefined>;
  set(key: string, value: V): void | Promise<void>;
  remove(key: string): void | Promise<void>;
};

type PersistOption<V> = boolean | PersistAdapter<V>;

// On AtomOptions:
persist?: PersistOption<V>;
```

- `persist: true` → use the built-in `localStorageAdapter`. JSON-encodes values, no-ops on the server (`typeof window === "undefined"`).
- `persist: false | undefined` → no persistence.
- `persist: { get, set, remove }` → any custom adapter. Sync or async; the engine handles both.

## Behavior

1. **Bootstrap.** On atom creation the adapter is read. If a value is present it's applied via `silentUpdate` (no `update` event fires for hydration). For async adapters the read is awaited and the value lands after the constructor returns.
2. **Write-through.** Every `update` / `change` / `merge` writes the new value to the adapter. `silentUpdate` does NOT write through (silent means silent — including to storage).
3. **Reset removes.** `reset()` deletes the entry from the adapter. The next session starts fresh.
4. **Error tolerance.** Both sync throws and async rejections from the adapter are swallowed — a transient storage error (quota exceeded, private-mode block, network blip on a remote adapter) doesn't crash the atom or its consumers.

## Examples

### Built-in localStorage

```ts
const themeAtom = createAtom({
  key: "ui.theme",
  default: "light" as "light" | "dark",
  persist: true,
});

themeAtom.update("dark");
// On next page load, themeAtom.value === "dark"
```

### Custom adapter — cookies (SSR-friendly)

```ts
import type { PersistAdapter } from "@mongez/atom";

function cookieAdapter(): PersistAdapter {
  return {
    get(key) {
      if (typeof document === "undefined") return undefined;
      const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
      if (!match) return undefined;
      try { return JSON.parse(decodeURIComponent(match[1])); } catch { return undefined; }
    },
    set(key, value) {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))};path=/;max-age=31536000`;
    },
    remove(key) {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=;path=/;max-age=0`;
    },
  };
}

const localeAtom = createAtom({
  key: "ui.locale",
  default: "en",
  persist: cookieAdapter(),
});
```

For real SSR, the cookie adapter needs server-side access too — wrap your framework's cookie API in the same shape on the server.

### Custom adapter — async (IndexedDB)

```ts
const idbAdapter: PersistAdapter = {
  async get(key) { return await idb.get(key); },
  async set(key, value) { await idb.set(key, value); },
  async remove(key) { await idb.delete(key); },
};

const draftAtom = createAtom({
  key: "draft",
  default: { title: "", body: "" },
  persist: idbAdapter,
});
```

Initial render shows the default until the IDB read resolves; then the atom flips to the stored value via `silentUpdate`. If your UI needs to gate on hydration completion, watch for the first change after mount.

### Custom adapter — `@mongez/cache`

```ts
import { cache } from "@mongez/cache";

const adapter: PersistAdapter = {
  get:    (key) => cache.get(key),
  set:    (key, value) => cache.set(key, value),
  remove: (key) => cache.remove(key),
};

const userAtom = createAtom({
  key: "user",
  default: { name: "Anon" },
  persist: adapter,
});
```

## Gotchas

- **`silentUpdate` doesn't write through.** This is intentional — silent means silent. Use the normal `update` if you want persistence.
- **The atom's `key` IS the storage key.** Avoid collisions across atoms; namespace your keys (`auth.user`, `ui.theme`, `feature.drafts`).
- **Hydration is via `silentUpdate`.** Subscribers won't fire an `update` event for the bootstrap value. If you need to react to "initial value loaded", subscribe via `onReset` (after the storage read, the value differs from the default — but there's no signal). Easier: use the React hooks; they'll re-render once the snapshot changes.
- **Server values aren't in localStorage.** The built-in `localStorageAdapter` no-ops on the server. For SSR, use a cookie adapter (the server has access via the request) or a session/request-keyed store.
- **Large or non-serializable values.** localStorage has a ~5MB cap and only supports JSON-serializable data. Custom adapters can lift those limits.
