---
title: "Permissions"
name: mongez-user-permissions
description: |
  How to store, check, and persist user permissions using `setPermissions()` and `can()` with dot-notation paths.
  TRIGGER when: code calls `user.setPermissions(...)`, `user.can("...")`, or imports `Role`, `PermissionGroup` types from `@mongez/user`; user asks "how do I check permissions / gate features by role / store user permissions / wire RBAC with @mongez/user"; file does permission checks against a `User` subclass instance.
  SKIP: CASL, Casbin, or other dedicated authorization libraries; backend policy/middleware authz unrelated to the client-side `User` class; generic feature flagging (LaunchDarkly, Unleash); roles stored entirely in the JWT without `setPermissions`.
sidebar:
  order: 50
---

`@mongez/user` ships a minimal permissions model: store an object, check a dot-notation path for a truthy value.

## API

```ts
user.setPermissions(obj);   // replaces the permissions object
user.can(path);             // boolean — truthy value at the path
```

Returns `true` only when `get(permissions, path)` produces a truthy value (`true`, `1`, `"yes"`, a non-empty array, …). Any falsy value or a missing key returns `false`.

## Shape examples

The library is shape-agnostic — pick what matches your backend. Some shapes that work:

### Flat dotted keys → booleans

```ts
user.setPermissions({
  "posts.create": true,
  "posts.delete": false,
  "admin.panel": true,
});

user.can("posts.create");   // true
user.can("posts.delete");   // false
user.can("posts.archive");  // false (missing)
```

### Nested objects → booleans

```ts
user.setPermissions({
  posts: { create: true, delete: false },
  admin: { panel: true },
});

user.can("posts.create");   // true
user.can("admin.panel");    // true
```

### Role names → truthy strings

```ts
user.setPermissions({
  posts: { create: "editor", delete: "admin" },
});

user.can("posts.create");   // true ("editor" is truthy)
```

This works but `can()` only tells you "yes/no" — it doesn't expose the role string. Read it directly via the underlying object if you need it:

```ts
import { get } from "@mongez/reinforcements";
const role = get(user["permissions"], "posts.create");
```

…though `permissions` is `protected`, so you'd need to expose it via a method on your subclass.

## Replace, not merge

```ts
user.setPermissions({ a: true });
user.setPermissions({ b: true });    // a is GONE now
user.can("a");                       // false
user.can("b");                       // true
```

If you want merge semantics, do it yourself before calling `setPermissions`.

## Persistence

`setPermissions` does NOT write to the cache driver. Permissions are runtime-only — re-set them after each `boot()` if you need them across sessions. Typical flow: fetch them after login, then call `setPermissions(response.permissions)`.

You can also store them inside `userData` (via `set("permissions", obj)`) so they ride along with the cache driver, then re-apply on boot:

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected enableEvents = true;

  public override boot() {
    super.boot();
    const persisted = this.get("permissions");
    if (persisted) this.setPermissions(persisted);
    return this;
  }
}

// On login:
user.login({ ...userData, permissions: response.permissions });
user.setPermissions(response.permissions);
```

## Defining permission types

```ts
import type { Role, PermissionGroup } from "@mongez/user";

const groups: PermissionGroup[] = [
  {
    text: "Posts",
    name: "posts",
    roles: [
      { text: "Create",  name: "create" },
      { text: "Delete",  name: "delete" },
    ],
  },
];
```

These types are exported for callers wiring permission UI. `setPermissions` itself accepts any object — the types are not enforced internally.
