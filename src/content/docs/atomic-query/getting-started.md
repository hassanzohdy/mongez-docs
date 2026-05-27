---
title: Get started with @mongez/atomic-query
description: Install, the 30-second tour, and where to go next.
sidebar:
  order: 1
---

`@mongez/atomic-query` is a **client-side** query cache for the Mongez ecosystem. React-Query-style API: `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`. Segment-aware invalidation, built-in list-mutation helpers, framework-loader integration via `<HydrateQueries>`.

Server-side data fetching belongs to your meta-framework (Next.js server component, Remix `loader`, TanStack Start `loader`). atomic-query is the seam: take their result and hand it to the cache.

## Install

```sh
yarn add @mongez/atomic-query
# peer: @mongez/atom, @mongez/react-atom, react >= 18
```

## Client-only

Every file carries `"use client"` and the `exports` map declares `"react-server": null`. **React Server Components physically cannot import this package** — the bundler will reject it with a clear message. That's intentional: SSR is the framework's job; this is the client cache.

## 30-second tour

```tsx
"use client";
import { queryAtom } from "@mongez/atomic-query";

export function UserList() {
  const { data, isLoading, error } = queryAtom.useQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      fetch("/api/users", { signal }).then(r => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox e={error} />;
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## SSR integration (Next.js App Router)

```tsx
// app/users/page.tsx — server component
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

The seeded data lands in the cache synchronously during render, so the client's first paint matches the server HTML — no flash, no hydration mismatch.

## Where to go next

- [Overview](../overview/) — pitch, install, mental model, scope.
- [Queries](../queries/) — `useQuery`, `Query<T>`, key hashing, retries, focus/reconnect refetch.
- [Mutations](../mutations/) — `useMutation`, optimistic patterns, abort semantics.
- [Infinite queries](../infinite/) — `useInfiniteQuery`, `fetchNextPage`, cursor + offset pagination.
- [Suspense mode](../suspense/) — `useSuspenseQuery`, render-time cache init, ErrorBoundary pairing.
- [Cache management](../cache/) — `invalidate`, `refetch`, `updateQueryData`, GC.
- [List helpers](../list-helpers/) — `push`, `unshift`, `remove`, `replace`, `sort`, `reverse`.
- [SSR integration](../ssr/) — `<HydrateQueries>`, framework loaders.

## License

MIT.
