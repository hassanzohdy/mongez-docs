---
title: "User Manager"
name: mongez-user-user-manager
description: |
  Complete reference for the `User` base class — subclassing, `boot()`, `login`/`logout`/`update`, `get`/`set`, token shortcuts, and protected field configuration.
sidebar:
  order: 50
---

The flagship export: the `User` base class. Subclass it, attach a cache driver, call `boot()`.

## Minimum subclass

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

class AppUser extends BaseUser {
  protected cacheDriver: UserCacheDriverInterface = myDriver;
}

const user = new AppUser();
user.boot();
```

The `cacheDriver` field is the only thing you usually need. Everything else has a default.

## Protected fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `cacheDriver` | `UserCacheDriverInterface \| undefined` | `undefined` | Where userData is persisted between sessions. If omitted, no persistence — session-only. |
| `permissions` | `object` | `{}` | The permissions object queried by `can()`. Set via `setPermissions()`. |
| `userData` | `object` | `{}` | The current user payload. Set internally by `boot` / `login` / `update` / `set`. |
| `accessTokenKey` | `string` | `"accessToken"` | Which key inside `userData` holds the bearer token. |
| `cacheKey` | `string` | `"user"` | The cache-driver key that stores the whole payload. |
| `enableEvents` | `boolean` | `false` | Whether to instantiate `UserEventsListener` on `this.events`. |
| `eventsBaseName` | `string \| undefined` | `cacheKey` | Namespace for the event bus topic. |

## `boot()`

Always required. The constructor does NOT touch the cache driver.

```ts
public boot(): UserInterface {
  this.userData = this.cacheDriver?.get(this.getCacheKey()) || {};

  if (this.enableEvents) {
    this.events = new UserEventsListener(this.eventsBaseName || this.cacheKey);
    this.events.triggerBoot(this.userData, this);
  }

  return this;
}
```

So:

1. Read the cache → hydrate `userData` (or `{}` if absent).
2. If `enableEvents` is true, instantiate the listener on `this.events` and fire `boot`.
3. Return `this` so you can chain (`new AppUser().boot()`).

## Identity methods

```ts
user.isLoggedIn();      // boolean — getAccessToken().length > 0
user.isNotLoggedIn();   // !isLoggedIn()
user.id;                // shorthand: this.get("id")
user.getCacheKey();     // returns the configured cacheKey
user.getAccessTokenKey(); // returns the configured accessTokenKey
user.setAccessTokenKey(s); // change it at runtime; returns `this`
```

## Session methods

### `login(userData)`

```ts
user.login({
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  accessToken: "eyJhbGc…",
});
```

Order of operations:

1. Fire `login` event (BEFORE the data is committed — listeners see `this.userData` still as the previous value).
2. Call `update(userData)` internally, which:
   - Preserves the previous token if not in the new payload.
   - Replaces `this.userData` with `userData`.
   - Fires `keyChange` for every key.
   - Writes to the cache driver.
   - Fires `change`.

Returns `this`.

### `logout()`

```ts
user.logout();
```

1. Clears `this.userData` to `{}`.
2. Removes the entry from the cache driver.
3. Fires `logout`.

### `update(userData)`

```ts
user.update({ id: 1, name: "Grace", email: "grace@example.com" });
```

Replaces the whole payload. If `userData` does not include the access token, the previous token is preserved. Fires per-key `keyChange` events and then `change`.

## Read / write methods

Dot-notation supported via `@mongez/reinforcements`.

```ts
user.get("name");                       // "Ada"
user.get("profile.address.country");    // "Egypt"
user.get("missing", "fallback");        // "fallback"
user.set("profile.country", "Egypt");   // creates nested object if needed
user.all();                             // entire userData
```

`set` is a no-op when the new value is referentially equal to the current value at that key — `user.set("name", user.get("name"))` doesn't fire `keyChange`.

## Token shortcuts

```ts
user.getAccessToken();              // string — "" when not logged in
user.setAccessToken("new");         // user.set(accessTokenKey, "new")
user.refreshToken("new");           // alias for setAccessToken
```

## Permissions

See [`permissions.md`](../permissions/) for the full pattern.

```ts
user.setPermissions({ posts: { create: true } });
user.can("posts.create");           // true
user.can("posts.delete");           // false (truthy check, missing → falsy)
```

## Examples

### Bearer token with a non-default key

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected accessTokenKey = "jwt";   // your API returns { jwt: "…" }
}

user.login({ id: 1, jwt: "eyJ…" });
user.isLoggedIn();        // true
user.getAccessToken();    // "eyJ…"
```

### A typed user with `implements UserInterface`

```ts
import { User as BaseUser, UserInterface, UserCacheDriverInterface } from "@mongez/user";

class AppUser extends BaseUser implements UserInterface {
  protected cacheDriver: UserCacheDriverInterface = myDriver;
}
```

This catches any future drift between the base class's method signatures and what your subclass exposes.

### Chain `new` and `boot()`

```ts
const user = new AppUser().boot() as AppUser;
```

`boot()` returns `UserInterface`, so cast back to the concrete type if you want subclass-specific methods.
