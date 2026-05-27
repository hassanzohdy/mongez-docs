---
title: Which package?
description: A decision guide for which @mongez/* package solves the problem in front of you.
---

Quick branches:

## "I want to share state between React components"

→ **`@mongez/react-atom`**.

Pick a preset if one fits:

- Toggle / modal-open flag → `openAtom("sidebar")`
- Loading flag → `loadingAtom("loginPending")`
- Fetch lifecycle (loading / data / error) → `fetchingAtom<User[]>("users")`
- Modal with payload → `portalAtom<{ userId: number }>("deleteUser")`

Otherwise `atom({ key, default, actions })` with custom action verbs.

## "I want to cache server data"

→ **`@mongez/atomic-query`**.

- A single fetch → `queryAtom.useQuery({ queryKey, queryFn })`
- A POST/PUT/DELETE → `useMutation({ mutationFn })`
- Paginated / infinite scroll → `useInfiniteQuery({ ..., getNextPageParam })`
- Want a Suspense boundary → `useSuspenseQuery({ ... })`

For initial server-rendered data, fetch in your framework's loader and pass to `<HydrateQueries entries={[...]}>`.

## "I want a value computed from other atoms"

→ **`@mongez/atom`**'s `derive(key, get => ...)`.

```ts
const fullName = derive("fullName", get => `${get(first)} ${get(last)}`);
```

Auto-tracks dependencies. Conditional reads work. Chained derives propagate.

## "I want to persist a user preference"

→ **`@mongez/atom`** with `persist: true` (localStorage) or `persist: PersistAdapter` (cookies, IndexedDB, etc.).

## "I'm doing SSR and need per-request isolation"

→ Wrap your tree with **`@mongez/react-atom`**'s `<AtomStoreProvider>`.

For hydration, use `<HydrateAtomsScript>` on the server + `readHydration()` on the client.

## "I just need a generic event bus"

→ **`@mongez/events`** directly.

```ts
import events from "@mongez/events";
events.subscribe("user.created", onCreate);
events.trigger("user.created", payload);
events.unsubscribeNamespace("user");  // bulk cleanup
```

## "I need deep-clone, dot-notation reads, async retries, etc."

→ **`@mongez/reinforcements`**. ~130 typed utility functions.

## "I'm using something else (Jotai, Zustand, TanStack Query)"

That's fine. Each Mongez package can be adopted in isolation:

- Use `@mongez/atom` alongside Zustand if you like the action-shaped DX.
- Use `@mongez/atomic-query` alongside Jotai if you like its list-mutation helpers.
- The packages don't try to replace the ecosystem — they offer a specific shape that pairs well with each other.
