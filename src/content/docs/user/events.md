---
title: "Events"
name: mongez-user-events
description: |
  How to enable and subscribe to the five `User` lifecycle events (boot, login, logout, change, keyChange) via `UserEventsListener` and the `@mongez/events` bus.
  TRIGGER when: code sets `enableEvents = true` or `eventsBaseName` on a `User` subclass; calls `user.events.onLogin`, `onLogout`, `onChange`, `onKeyChange`, `onBoot`, or uses `UserEventsListener`; user asks "how do I react to login / fire side effects on logout / subscribe to auth events / invalidate caches on logout"; subscribes to `events.subscribe("auth.login", ...)` topics from `@mongez/events`.
  SKIP: @mongez/events for generic app-wide pub/sub unrelated to auth lifecycle; DOM `addEventListener`; framework state-change hooks (e.g. React effect deps); pure component re-render concerns.
sidebar:
  order: 50
---

Each `User` instance can have a `UserEventsListener` attached to `this.events`. The listener is opt-in and dispatches through `@mongez/events`.

## Enabling

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected enableEvents = true;           // off by default
  protected eventsBaseName = "auth";       // defaults to cacheKey
}

const user = new AppUser();
user.boot();

user.events!.onLogin((userData, u) => { /* … */ });
```

Without `enableEvents = true`, `user.events` is `undefined` and the trigger methods are skipped internally.

## The five events

| Event | Listener method | Args | Fires |
|---|---|---|---|
| `boot` | `onBoot(cb)` | `(initData, user)` | At the end of `boot()`. |
| `login` | `onLogin(cb)` | `(userData, user)` | At the START of `login()`, before the data is committed. |
| `logout` | `onLogout(cb)` | `(user)` | At the end of `logout()`. |
| `change` | `onChange(cb)` | `(newData, oldData, user)` | At the end of `update()`. |
| `keyChange` | `onKeyChange(cb)` | `(key, newValue, oldValue, user)` | At the end of `set()` and once per key inside `update()`. |

All listener methods return an `EventSubscription` from `@mongez/events`. Call `.unsubscribe()` to remove the listener.

## Bus topics

Events dispatch on the global `@mongez/events` bus under `${eventsBaseName || cacheKey}.${eventType}`. That means you can subscribe from anywhere without holding the `user` reference:

```ts
import events from "@mongez/events";

events.subscribe("auth.login", (userData, user) => {
  console.log("Welcome", userData.name);
});

events.subscribe("auth.logout", (user) => {
  // Clear cached queries, reset atoms, redirect, …
});
```

The `eventsBaseName` matters: pick a stable namespace early. Different subclasses can use different namespaces if you have multiple user types in one app.

## `onLogin` fires BEFORE the data is committed

This is the trigger order inside `login(userData)`:

```ts
public login(userData: UserInfo): UserInterface {
  if (this.events) {
    this.events.triggerLogin(userData, this);   // ← fires first
  }
  this.update(userData);                        // ← commits + fires keyChange + change
  return this;
}
```

So inside an `onLogin` callback, `user.get(...)` still returns the PREVIOUS values. The callback's first argument (`userData`) is the new payload. If you need post-commit values, listen to `change` instead.

## Multiple listeners + unsubscribe

```ts
const sub1 = user.events!.onLogin(cbA);
const sub2 = user.events!.onLogin(cbB);

// Both run on login. Unsubscribe individually:
sub1.unsubscribe();
```

## Subscribing without `enableEvents`

You can subscribe to the topic directly via the events bus even if the user instance doesn't have `events` set — but then nobody is dispatching, so the listener will never fire. `enableEvents = true` is needed for any event flow.

## Patterns

### Cross-module reaction

```ts
// auth.ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected enableEvents = true;
  protected eventsBaseName = "auth";
}

// elsewhere/queries.ts
import events from "@mongez/events";

events.subscribe("auth.logout", () => {
  queryCache.invalidateAll();
});
```

### React without a hook

You can subscribe in `useEffect` and call `setState` on the value:

```tsx
function useUserName(user: AppUser) {
  const [name, setName] = useState(user.get("name", ""));
  useEffect(() => {
    if (!user.events) return;
    const sub = user.events.onKeyChange((key, next) => {
      if (key === "name") setName(next);
    });
    return () => sub.unsubscribe();
  }, [user]);
  return name;
}
```

The same pattern works for any framework with effect hooks.

## Caveats

- `UserEventsListener` always dispatches through the singleton `events` bus imported from `@mongez/events`. There's no per-instance bus and no way to swap it — every `User` in the process shares the same topic space. Pick distinct `eventsBaseName` values when you have multiple user types so their topics don't collide (see `mongez-user-recipes` for the admin/customer split).
