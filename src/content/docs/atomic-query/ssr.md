---
title: "SSR & stores"
name: mongez-atomic-query-ssr
description: |
  How to seed the @mongez/atomic-query client cache from server-side data using HydrateQueries, with examples for Next.js App Router, Remix, and TanStack Start.
  TRIGGER when: code imports `HydrateQueries`, `seedQuery`, `SeedEntry`, or `HydrateQueriesProps` from `@mongez/atomic-query`; user asks "how do I SSR with atomic-query / seed cache from Next.js server component / hydrate from a Remix loader / prefetch on hover"; typical import `import { HydrateQueries } from "@mongez/atomic-query"`.
  SKIP: pure client-side `useQuery` usage — use `mongez-atomic-query-basic-query` or `mongez-atomic-query-queries`; cache invalidation/refetch after first paint — use `mongez-atomic-query-invalidation`; suspense rendering boundaries — use `mongez-atomic-query-suspense`; non-SSR cache-API questions — use `mongez-atomic-query-cache`.
sidebar:
  order: 40
---

atomic-query is **client-only**. Server-side data fetching is your framework's job. The seam between the two is `<HydrateQueries>`: your loader fetches, you pass the result to the component, the cache picks it up on first render.

## `<HydrateQueries>`

```tsx
import { HydrateQueries, type SeedEntry } from "@mongez/atomic-query";

<HydrateQueries entries={[
  { queryKey: ["users"], data: usersFromLoader },
  { queryKey: ["currentUser"], data: currentUserFromLoader, freshFor: 60_000 },
]}>
  <App />
</HydrateQueries>
```

Each entry seeds the cache with `state: "success"`, `isLoading: false`. Consumers using `queryAtom.useQuery({ queryKey: ["users"], queryFn, staleTime: 60_000 })` see the seeded data on first render — no flash, no spinner, no refetch as long as it's fresh.

`freshFor` (optional) overrides the consumer's `staleTime` for this entry.

## Next.js (App Router)

```tsx
// app/users/page.tsx — server component
import { HydrateQueries } from "@mongez/atomic-query";
import { UserListClient } from "./UserListClient";

export default async function Page() {
  const users = await db.users.findMany();
  return (
    <HydrateQueries entries={[{ queryKey: ["users"], data: users }]}>
      <UserListClient />
    </HydrateQueries>
  );
}
```

```tsx
// app/users/UserListClient.tsx
"use client";
import { queryAtom } from "@mongez/atomic-query";

export function UserListClient() {
  const { data } = queryAtom.useQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      fetch("/api/users", { signal }).then(r => r.json()),
    staleTime: 60_000,
  });
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## Remix

```tsx
// app/routes/users.tsx
import { json, useLoaderData } from "@remix-run/react";
import { HydrateQueries } from "@mongez/atomic-query";
import { UserList } from "~/components/UserList";

export async function loader() {
  return json({ users: await db.users.findMany() });
}

export default function UsersRoute() {
  const { users } = useLoaderData<typeof loader>();
  return (
    <HydrateQueries entries={[{ queryKey: ["users"], data: users }]}>
      <UserList />
    </HydrateQueries>
  );
}
```

## TanStack Start

```tsx
// app/routes/users.tsx
import { createFileRoute } from "@tanstack/start";
import { HydrateQueries } from "@mongez/atomic-query";

export const Route = createFileRoute("/users")({
  loader: async () => ({ users: await db.users.findMany() }),
  component: UsersRoute,
});

function UsersRoute() {
  const { users } = Route.useLoaderData();
  return (
    <HydrateQueries entries={[{ queryKey: ["users"], data: users }]}>
      <UserList />
    </HydrateQueries>
  );
}
```

## What about `useSuspenseQuery`?

atomic-query doesn't ship one. Streaming Suspense responsibility is yours via the framework:

- Next.js: do the await in a server component; suspense boundaries belong there.
- Remix: `defer()` + `<Await>`.
- TanStack: `pendingComponent` on the route.

Hand the resolved data into `<HydrateQueries>` and have client components do plain `useQuery`. Same outcome as suspense queries, with the framework owning the boundary.

## What about `prefetchQuery`?

For SSR, fetch in the framework loader instead — same effect, fewer moving parts.

For client-side prefetching (e.g., hover-over-link), fire the `queryFn` manually and call `seedQuery`:

```ts
async function prefetchUser(id: number) {
  const user = await api.users.get(id);
  queryAtom.seedQuery({ queryKey: ["users", id], data: user });
}

<Link onMouseEnter={() => prefetchUser(user.id)} href={`/users/${user.id}`}>
  ...
</Link>
```
