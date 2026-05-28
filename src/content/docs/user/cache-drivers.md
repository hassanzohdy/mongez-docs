---
title: "Cache Drivers"
name: mongez-user-cache-drivers
description: |
  How to implement and supply a `UserCacheDriverInterface` to persist user data across sessions, with ready-made examples for localStorage, sessionStorage, cookies, in-memory, and async backends.
sidebar:
  order: 50
---

The `User` class persists `userData` through a small interface — anything that satisfies it works.

## The contract

```ts
type UserCacheDriverInterface = {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  remove(key: string): void;
  [id: string]: any;
};
```

Three methods. Sync only (the user manager doesn't await). The driver is consulted in three places:

| Method | When |
|---|---|
| `get(cacheKey)` | Called once inside `boot()` to hydrate `userData`. |
| `set(cacheKey, value)` | Called inside `set()` and `update()` after `userData` mutates. |
| `remove(cacheKey)` | Called inside `logout()`. |

## Built-in drivers

There are no built-in drivers in this package — bring your own. The Mongez sibling [`@mongez/cache`](https://github.com/hassanzohdy/cache) implements the shape directly:

```ts
import cache from "@mongez/cache";
import { User as BaseUser } from "@mongez/user";

class AppUser extends BaseUser {
  protected cacheDriver = cache;
}
```

## Common drivers

### localStorage (browser)

```ts
const localStorageDriver: UserCacheDriverInterface = {
  get(key) {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  set(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};
```

The `typeof localStorage === "undefined"` guards make it safe to import on the server.

### sessionStorage (browser, tab-scoped)

Same shape, swap `localStorage` for `sessionStorage`. State clears when the tab closes.

### Cookies (SSR-friendly, sent with every request)

```ts
const cookieDriver: UserCacheDriverInterface = {
  get(key) {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
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
```

For real SSR, you also need a server-side cookie reader matching the same shape — your framework will have one.

### In-memory (tests, per-request SSR)

```ts
function memoryDriver(): UserCacheDriverInterface {
  const store = new Map<string, any>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => { store.set(key, value); },
    remove: (key) => { store.delete(key); },
  };
}

const driver = memoryDriver();
class AppUser extends BaseUser { protected cacheDriver = driver; }
```

A fresh driver per request gives you per-request isolation without a SSR store primitive.

### IndexedDB / async backends

The base `User` calls the driver synchronously, so async drivers don't fit cleanly — `boot()` won't await your `get`. If you absolutely need IDB, do the read outside, then call `user.login(payload)` once it's done.

## What gets persisted

Whatever `userData` currently is. After `login({ id: 1, name: "Ada", accessToken: "…" })`, the driver receives that whole object under `cacheKey`. The next `boot()` reads it back verbatim — no merging, no schema check.

Make sure your data is JSON-safe (no `Date` instances, `Map`s, `Set`s, class instances) if your driver stringifies. The localStorage and cookie drivers above do.

## Default behavior without a driver

If the subclass doesn't set `cacheDriver`:

- `boot()` reads `undefined?.get(…)` → safe, `userData` stays `{}`.
- `set` / `update` / `logout` call `this.cacheDriver?.…()` → safe, no-op.

So the package degrades gracefully to a session-only memory store. Useful in tests or for SSR where you don't want any cross-request persistence.
