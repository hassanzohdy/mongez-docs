---
title: "User"
name: mongez-user-overview
description: |
  High-level architecture of `@mongez/user` — class hierarchy, mental model, scope boundaries, and install.
  TRIGGER when: code imports `User`, `UserEventsListener`, `setCurrentUser`, `getCurrentUser`, or types `UserInterface`, `UserInfo`, `UserCacheDriverInterface`, `UserEvents` from `@mongez/user`; user asks "what is @mongez/user / how does it fit together / does it have a React hook / how do I get started"; file shows `import { User } from "@mongez/user"` as a first introduction.
  SKIP: NextAuth, Auth0 SDK, Clerk, Firebase Auth, or any third-party auth provider; raw JWT decoding libraries (`jsonwebtoken`, `jose`); React-specific auth context wrappers without the `User` base class.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/user` is a framework-agnostic auth/session primitive. It gives you a `User` base class you subclass, plug a cache driver into, and call methods on (`login`, `logout`, `get`, `set`, `can`). It runs in the browser and on Node.

The state model is class-based — a concrete user object holds its own `userData`, its own permissions, and (optionally) its own event listener. There is no React adapter and no global store; if you need cross-module access to "the current user" there's a single module-level pointer (`getCurrentUser`).

For app-wide state beyond auth, reach for [`@mongez/atom`](https://github.com/hassanzohdy/mongez-atom). For typed events, [`@mongez/events`](https://github.com/hassanzohdy/events) — which this package uses internally.

## Install

```sh
yarn add @mongez/user
# peer: @mongez/events, @mongez/reinforcements
```

## Import pattern

```ts
import {
  User,
  UserEventsListener,
  setCurrentUser,
  getCurrentUser,
  type UserInterface,
  type UserInfo,
  type UserCacheDriverInterface,
  type UserEvents,
} from "@mongez/user";
```

## Mental model

| Concept | Type | Mental model |
|---|---|---|
| User | `User` (subclassed) | A typed user payload + bound methods. One instance per app, typically. |
| Cache driver | `UserCacheDriverInterface` | Three methods (`get`/`set`/`remove`) — anything that persists data. |
| Events | `UserEventsListener` on `user.events` | Optional pub/sub for `boot`/`login`/`logout`/`change`/`keyChange`. |
| Current user | module global | `setCurrentUser` / `getCurrentUser` — a single shared slot. |
| Permissions | plain object on the instance | Replaced via `setPermissions`, queried via `can(dot.path)`. |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| Login UI / forms / network calls | Your app | This library only manages state, not transport. |
| Storage primitive (cookies, localStorage, IDB) | The cache driver you supply | Keeps the package storage-agnostic. |
| App-wide reactive state | `@mongez/atom` | A different abstraction (atoms). Compose if you need both. |
| Event bus | `@mongez/events` | Shared dependency; events are dispatched there. |
| Object/string utilities | `@mongez/reinforcements` | `get` / `set` for dot-notation. Used internally. |

## The class hierarchy

```
UserInterface  (type contract)
     │
     ▼
   User       (base class — abstract in practice)
     │
     ▼
  AppUser     (your subclass — declares cacheDriver and any overrides)
```

`UserEventsListener` is a separate class instantiated on `user.events` during `boot()` when events are enabled. It implements the `UserEvents` type and dispatches through `@mongez/events`.
