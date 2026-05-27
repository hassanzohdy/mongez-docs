---
title: "Current User"
name: mongez-user-current-user
description: |
  How to use the module-level current user pointer (`setCurrentUser` / `getCurrentUser`) for cross-module access to the logged-in user.
  TRIGGER when: code imports `setCurrentUser` or `getCurrentUser` from `@mongez/user`; user asks "how do I access the current user from anywhere / get the logged-in user in middleware / share user across modules"; file calls `getCurrentUser()?.getAccessToken()` or sets the global slot after `boot()`; `import { setCurrentUser, getCurrentUser } from "@mongez/user"`.
  SKIP: @mongez/atom for app-wide reactive state beyond a single global slot; React Context / Redux-style stores; per-request SSR user threading (use request context instead — see `mongez-user-recipes`).
sidebar:
  order: 50
---

A single module-level slot for "the logged-in user", set and read from anywhere.

## API

```ts
import { setCurrentUser, getCurrentUser } from "@mongez/user";

setCurrentUser(user);     // store a user instance
getCurrentUser();         // retrieve it (returns the same User, or undefined)
```

## When to use it

For code that needs to reach the current user without importing the module where the user is defined — middleware, generic API helpers, error reporters, etc.

```ts
// src/auth.ts
import { User as BaseUser, setCurrentUser } from "@mongez/user";

class AppUser extends BaseUser { /* … */ }
const user = new AppUser();
user.boot();
setCurrentUser(user);
export default user;
```

```ts
// src/api/with-auth.ts
import { getCurrentUser } from "@mongez/user";

export function withAuth(request: Request): Request {
  const u = getCurrentUser();
  const token = u?.getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
}
```

## Caveats

- It's a **module-level** variable. In a Node process serving multiple requests, all requests share the slot. This is fine in a browser (one user per tab) but a footgun in SSR — do NOT use it server-side; thread the user instance through your request context instead.
- Tests need to reset it between cases. Either call `setCurrentUser(undefined as any)` in `afterEach`, or never call `setCurrentUser` in a test that the next test will run after.
- `getCurrentUser()` is typed `User | undefined` — it returns `undefined` until `setCurrentUser` has been called, so always null-check (or use `?.`) before calling methods on the result.

## Lifecycle

The pointer doesn't auto-update on `logout()`. If your code reads `getCurrentUser()?.isLoggedIn()`, that returns `false` after logout (because the user instance reports it), but `getCurrentUser()` itself still returns the same instance. There's no way to "unset" the slot except by setting it to `undefined`:

```ts
user.logout();
setCurrentUser(undefined as any);
```

Most apps don't need to do this — they just check `isLoggedIn()` and gate on that.
