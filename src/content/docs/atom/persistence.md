---
title: "Persistence"
name: mongez-atom-persistence
description: |
  How to persist atom values across page loads using the built-in `localStorageAdapter` or a custom `PersistAdapter` (cookies, IndexedDB, any sync/async store).
sidebar:
  order: 50
---

## The persist option

`persist` is an option on `createAtom`. It accepts:

| Value | Effect |
|---|---|
| `true` | Use the built-in `localStorageAdapter` (JSON encode/decode, client-only) |
| `false` / omitted | No persistence |
| `PersistAdapter` object | Use your custom adapter (sync or async) |

## Built-in localStorage (client-only)

```ts
import { createAtom } from "@mongez/atom";

const themeAtom = createAtom({
  key: "ui.theme",
  default: "light" as "light" | "dark",
  persist: true,
});

// On first load: themeAtom.value === "light" (default)
// After user picks "dark": themeAtom.value === "dark", written to localStorage["ui.theme"]
// On next page load: themeAtom.value === "dark" (restored silently)
themeAtom.update("dark");
```

The atom key is used directly as the `localStorage` key. JSON.stringify/parse is applied automatically.

**Server note**: The built-in adapter checks `typeof window === "undefined"` and no-ops silently. On the server the atom always starts from `default`. For SSR-safe persistence, use a custom cookie adapter (see below).

## Lifecycle of persisted state

1. **Creation** — the adapter's `get(key)` is called. If a value is present, it is applied via `silentUpdate` (no `update` event fires, so React subscribers don't trigger an extra render on mount).
2. **Every update** — the adapter's `set(key, value)` is called synchronously inside `onChange`. Async adapters are awaited internally; errors are swallowed so a storage failure never breaks the update flow.
3. **reset()** — the adapter's `remove(key)` is called, clearing the persisted entry. The atom goes back to its `default`.

## Custom adapter — shape

```ts
import { type PersistAdapter } from "@mongez/atom";

// Methods may return plain values (sync) or Promises (async).
const myAdapter: PersistAdapter = {
  get(key: string): unknown | undefined | Promise<unknown | undefined> { /* ... */ },
  set(key: string, value: unknown): void | Promise<void>              { /* ... */ },
  remove(key: string): void | Promise<void>                           { /* ... */ },
};
```

## Cookie adapter (SSR-safe example)

For Next.js or similar SSR frameworks, use a cookie-based adapter so the server can read persisted values during rendering:

```ts
import { type PersistAdapter } from "@mongez/atom";

// Works on both client (document.cookie) and server (req.cookies injected via closure).
function makeCookieAdapter(
  getServerCookies?: () => Record<string, string>
): PersistAdapter {
  return {
    get(key) {
      if (typeof document !== "undefined") {
        const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
        return match ? JSON.parse(decodeURIComponent(match[1])) : undefined;
      }
      // Server-side: use injected request cookies
      const cookies = getServerCookies?.() ?? {};
      const raw = cookies[key];
      return raw !== undefined ? JSON.parse(raw) : undefined;
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

const themeAtom = createAtom({
  key: "ui.theme",
  default: "light",
  persist: makeCookieAdapter(),
});
```

## IndexedDB adapter (async example)

```ts
import { type PersistAdapter } from "@mongez/atom";

const idbAdapter: PersistAdapter = {
  async get(key) {
    const db = await openDB();           // your idb helper
    return db.get("atoms", key);
  },
  async set(key, value) {
    const db = await openDB();
    await db.put("atoms", value, key);
  },
  async remove(key) {
    const db = await openDB();
    await db.delete("atoms", key);
  },
};

const heavyAtom = createAtom({
  key: "heavy.data",
  default: {},
  persist: idbAdapter,
});
```

## Per-atom adapter (different stores for different atoms)

You can pass a different adapter per atom — no global configuration needed:

```ts
const prefs = createAtom({
  key: "prefs",
  default: { fontSize: 14 },
  persist: localStorageAdapter,    // fine for user prefs
});

const session = createAtom({
  key: "session",
  default: { token: "" },
  persist: sessionStorageAdapter,  // your custom adapter backed by sessionStorage
});
```

## Accessing the built-in adapter directly

```ts
import { localStorageAdapter } from "@mongez/atom";

// Use as-is:
const atom = createAtom({ key: "x", default: 0, persist: localStorageAdapter });

// Or extend it:
const prefixedAdapter: PersistAdapter = {
  get: key => localStorageAdapter.get(`myapp:${key}`),
  set: (key, v) => localStorageAdapter.set(`myapp:${key}`, v),
  remove: key => localStorageAdapter.remove(`myapp:${key}`),
};
```

## Key pitfalls

- **`persist: true` is client-only.** On Node/SSR, `window` is undefined and the adapter silently no-ops. The atom always starts from `default` on the server. Use a cookie adapter for SSR.
- **Async adapter, async hydration.** When `get()` returns a `Promise`, the atom starts at `default` and switches to the stored value when the promise resolves. In React, this causes a one-render delay. For SSR, sync adapters (cookies) avoid this flash.
- **`reset()` removes the storage entry.** The next session starts from `default` again. This is intentional — a reset means "clear persisted state".
- **The atom key is the storage key.** If you rename an atom's key, old persisted data under the previous key becomes orphaned. Clean up manually if needed.
- **Adapter errors are swallowed.** `QuotaExceededError`, private-mode blocks, or any sync throw inside `set`/`remove` is caught and ignored so the atom update still succeeds. Monitor storage errors separately if needed.
- **`beforeUpdate` still applies after restore.** The value loaded from the adapter passes through `beforeUpdate` via `silentUpdate`. Make sure your `beforeUpdate` handles the persisted shape correctly.
