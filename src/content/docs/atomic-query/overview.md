---
title: "Atomic Query"
name: mongez-atomic-query-overview
description: |
  What @mongez/atomic-query is, how it relates to @mongez/react-atom, and when to reach for it instead of TanStack Query.
  TRIGGER when: code imports `queryAtom` or `HydrateQueries` from `@mongez/atomic-query` for the first time in a project; user asks "what is @mongez/atomic-query / should I use it / how is it different from TanStack Query / how does it fit with @mongez/atom / why is it client-only"; typical import `import { queryAtom } from "@mongez/atomic-query"`.
  SKIP: concrete hook usage (`useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`) — use the matching task-specific skill; cache management — use `mongez-atomic-query-cache` or `mongez-atomic-query-invalidation`; SSR seeding mechanics — use `mongez-atomic-query-ssr`; list/array helpers — use `mongez-atomic-query-list-helpers`.
sidebar:
  order: 10
  label: "Overview"
---

## Install

```sh
# npm
npm install @mongez/atomic-query

# yarn
yarn add @mongez/atomic-query

# pnpm
pnpm add @mongez/atomic-query
```

Peer: `react >= 18`. Runtime deps: `@mongez/events`, `@mongez/react-atom` (installed automatically).

## Quick example

A typed query with abort-on-stale, 60-second cache, and loading / error / data branches built in:

```tsx
"use client";
import { queryAtom } from "@mongez/atomic-query";

type User = { id: number; name: string };

export function UserList() {
  const { data, isLoading, error } = queryAtom.useQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) => fetch("/api/users", { signal }).then(r => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## When to use

Reach for this skill when:
- Someone asks what `@mongez/atomic-query` is or does.
- Someone is deciding between atomic-query and TanStack Query.
- Someone asks how atomic-query relates to `@mongez/atom` / `@mongez/react-atom`.
- Someone asks about the SSR / server-rendering integration story.
- Someone asks why the package is "client-only."

## How to use

### What it is

`@mongez/atomic-query` is a **client-side server-state cache** built on top of `@mongez/react-atom`. It gives you React-Query-style query/mutation hooks without adding a second cache system alongside the atom ecosystem.

It is **not a replacement for your framework's data loader**. The intended split is:

- **Framework loader** (Next.js server component, Remix `loader`, TanStack Start `loader`) — handles the initial server render and produces the first dataset.
- **atomic-query** — takes over on the client for all mutations, optimistic updates, background refetches, invalidations, and list manipulation after that first paint.

### Relationship to @mongez/react-atom

`@mongez/atomic-query` creates a single atom (called `queryAtom`) whose value is a `{ queries: Record<string, Query> }` map. Every hook, helper, and imperative action reads from and writes to that one atom. This means:

- You get all atom features (subscriptions, devtools, direct `.get()`/`.change()` calls) on query state for free.
- There is one consistent mental model for both ephemeral UI state (regular atoms) and server state (query atoms) instead of two separate reactive systems.

### When to use atomic-query vs TanStack Query

| Use atomic-query | Use TanStack Query |
|---|---|
| You are already using `@mongez/atom` throughout the app | You are not on `@mongez/atom` |
| You want built-in list helpers (`push`, `unshift`, `remove`, …) | You need bidirectional infinite scroll (atomic-query's `useInfiniteQuery` is forward-only — no `getPreviousPageParam`) |
| You want a smaller surface area and are comfortable owning SSR through your framework loader | You need the full TanStack Query feature set (Suspense, dehydrate/hydrate, devtools, normalisation) |

### Client-only constraint

Every file in the package carries `"use client"` and the exports map declares `"react-server": null`. **React Server Components cannot import this package** — the bundler will error with a clear message. This is intentional: the cache is a client concern. Seed initial data from server components via `<HydrateQueries>`.

### SSR seeding with HydrateQueries

```tsx
// server component
import { HydrateQueries } from "@mongez/atomic-query";
import { UserListClient } from "./UserListClient";

export default async function UsersPage() {
  const users = await db.users.findMany();
  return (
    <HydrateQueries entries={[{ queryKey: ["users"], data: users }]}>
      <UserListClient />
    </HydrateQueries>
  );
}
```

The seeded data lands in the cache synchronously during render — no flash, no hydration mismatch.

## Key details / Pitfalls

- **Peer deps**: `@mongez/atom`, `@mongez/react-atom`, React >= 18.
- `HydrateQueries` is the React wrapper around `queryAtom.seedQuery()`. Either approach seeds the cache synchronously.
- Do not try to use atomic-query in a Next.js App Router server component — the bundler will refuse to compile it.
- The `queryAtom` singleton is the recommended entry point. All methods (`useQuery`, `invalidate`, `updateQueryData`, list helpers, etc.) live on it. Standalone function exports (`import { invalidate } from "@mongez/atomic-query"`) are available as aliases for the same operations.
