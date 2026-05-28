---
title: "Recipes"
name: mongez-user-recipes
description: |
  End-to-end composition patterns for common `@mongez/user` scenarios — browser auth, login with side effects, token attachment, refresh on 401, SSR per-request isolation, and multiple user types.
sidebar:
  order: 99
---

Idiomatic compositions across `@mongez/user` features.

## A browser app with localStorage persistence

```ts
import {
  User as BaseUser,
  UserCacheDriverInterface,
  setCurrentUser,
} from "@mongez/user";

const localStorageDriver: UserCacheDriverInterface = {
  get(key) {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  },
  set(key, value) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

class AppUser extends BaseUser {
  protected cacheDriver = localStorageDriver;
  protected accessTokenKey = "token";
  protected enableEvents = true;
  protected eventsBaseName = "auth";
}

const user = new AppUser();
user.boot();              // restores session if any
setCurrentUser(user);
export default user;
```

After login, the next page reload calls `boot()` and finds the same data in localStorage. The user is "still logged in" without any extra wiring.

## Login flow with side effects

```ts
import user from "./auth";
import events from "@mongez/events";

async function login(credentials: { email: string; password: string }) {
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  }).then(r => r.json());

  user.login({
    id: response.id,
    name: response.name,
    email: response.email,
    token: response.token,
  });
  user.setPermissions(response.permissions);
}

// React from anywhere:
events.subscribe("auth.login", (userData) => {
  analytics.identify(userData.id, { name: userData.name });
});
events.subscribe("auth.logout", () => {
  analytics.reset();
  queryCache.invalidateAll();
});
```

## Auto-attach the token to every fetch

```ts
import { getCurrentUser } from "@mongez/user";

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getCurrentUser()?.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
```

## Refresh token on 401

```ts
import user from "./auth";

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, { ...init, headers: withAuth(init.headers) });
  if (res.status !== 401) return res;

  // Try a refresh
  const refresh = await fetch("/api/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: user.get("refreshToken") }),
  });
  if (!refresh.ok) {
    user.logout();
    throw new Error("Session expired");
  }
  const { token } = await refresh.json();
  user.refreshToken(token);

  // Retry the original
  return fetch(path, { ...init, headers: withAuth(init.headers) });
}
```

## Per-tab session (sessionStorage)

Swap `localStorage` for `sessionStorage` in the driver. State clears when the tab closes.

```ts
const sessionStorageDriver: UserCacheDriverInterface = {
  get(key) {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  },
  set(key, value) {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
  },
};
```

## Per-request user in Node

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

function memoryDriver(): UserCacheDriverInterface {
  const store = new Map<string, any>();
  return {
    get: (k) => store.get(k) ?? null,
    set: (k, v) => { store.set(k, v); },
    remove: (k) => { store.delete(k); },
  };
}

class AppUser extends BaseUser {}

app.use((req, res, next) => {
  const user = new AppUser();
  (user as any).cacheDriver = memoryDriver();
  user.boot();
  // Hydrate from the request's session cookie / Authorization header
  if (req.session?.user) user.login(req.session.user);
  (req as any).user = user;
  next();
});
```

Do NOT call `setCurrentUser(user)` here — the module-level slot would leak across requests.

## Multiple user types

If your app has both an admin user and a customer user, use distinct subclasses with distinct cache keys and event namespaces:

```ts
class AdminUser extends BaseUser {
  protected cacheDriver = driver;
  protected cacheKey = "admin";
  protected eventsBaseName = "admin";
}

class CustomerUser extends BaseUser {
  protected cacheDriver = driver;
  protected cacheKey = "customer";
  protected eventsBaseName = "customer";
}
```

They persist to different keys, fire on different topics, and don't interfere.

## Logout on auth-event from elsewhere

```ts
import events from "@mongez/events";
import user from "./auth";

// Some other module decides we need to log out (e.g., a server-sent event)
events.subscribe("server.session-expired", () => {
  user.logout();
});
```

`user.logout()` will fire `auth.logout` in turn — listeners react to that. The two are decoupled.
