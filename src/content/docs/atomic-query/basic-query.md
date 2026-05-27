---
title: "Basic Query"
name: mongez-atomic-query-basic-query
description: |
  How to use queryAtom.useQuery — options, return shape, granular field hooks, suspense mode, and cache key serialisation rules.
  TRIGGER when: code imports `queryAtom`, `useQuery`, `useSuspenseQuery`, `useLoadChange`, `useErrorChange`, `useDataChange`, `useQueryChange`, `onQueryChange`, `getData`, `getQuery`, or `invalidate` from `@mongez/atomic-query`; user asks "how do I fetch data / write a useQuery / configure staleTime / avoid unnecessary re-renders / subscribe to one field"; typical import `import { queryAtom } from "@mongez/atomic-query"`.
  SKIP: write-side operations (POST/PUT/DELETE) — use `mongez-atomic-query-mutations`; cache invalidation and refetch patterns — use `mongez-atomic-query-invalidation` or `mongez-atomic-query-cache`; cursor/page-based pagination — use `mongez-atomic-query-infinite`; server-side seeding via `<HydrateQueries>` — use `mongez-atomic-query-ssr`; suspense-only `useSuspenseQuery` deep-dives — use `mongez-atomic-query-suspense`.
sidebar:
  order: 50
---

## When to use

Use this skill when:
- Someone needs to write their first `useQuery` call.
- Someone asks about `queryKey` structure, hashing, or serialisation.
- Someone asks what `staleTime`, `gcTime`, `refetchOnMount`, `refetchOnWindowFocus`, or `refetchOnReconnect` do.
- Someone wants to optimise renders by subscribing to only one field of a query.
- Someone asks about `useSuspenseQuery`.
- Someone asks about non-React subscriptions (`queryAtom.onQueryChange`).

## How to use

### Minimal usage

```tsx
"use client";
import { queryAtom } from "@mongez/atomic-query";

function UserList() {
  const { data, isLoading, error } = queryAtom.useQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      fetch("/api/users", { signal }).then(r => r.json()),
  });

  if (isLoading) return <Spinner />;
  if (error) return <p>Error: {String(error)}</p>;
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Full options

```ts
queryAtom.useQuery<T>({
  // Required
  queryKey: QueryKey;          // e.g. ["users"] or ["users", userId, "profile"]
  queryFn: (ctx: { signal: AbortSignal }) => Promise<T>;

  // Callbacks
  onSuccess?: (data: T, query: Query<T>) => void;
  onError?: (error: any, query: Query<T>) => void;

  // Reactivity
  watch?: boolean;             // default true — set false to snapshot without subscribing

  // Retry
  retry?: number;              // default 0
  retryDelay?: number | ((attempt: number) => number);
  retryCondition?: (error: any, attempt: number) => boolean;

  // Freshness
  staleTime?: number;          // ms data stays fresh; default 0 (always stale)
  gcTime?: number;             // ms after last observer before GC; default 300_000 (5 min)

  // Automatic refetch triggers
  refetchOnMount?: boolean;    // default true
  refetchOnWindowFocus?: boolean; // default false
  refetchOnReconnect?: boolean;   // default false
})
```

### Return shape — Query<T>

| Field | Type | Meaning |
|---|---|---|
| `data` | `T \| undefined` | Cached value; `undefined` until first successful fetch. |
| `isLoading` | `boolean` | `true` only during the FIRST fetch (no data yet). |
| `isFetching` | `boolean` | `true` during ANY fetch (initial or background). |
| `isError` | `boolean` | Last attempt failed. |
| `error` | `unknown \| null` | Error from last failed attempt. |
| `state` | `"idle" \| "loading" \| "error" \| "success"` | Coarse lifecycle. |
| `isRetrying` | `boolean` | Currently waiting between retry attempts. |
| `lastModified` | `number` | Timestamp of last completed transition. |
| `lastSuccessAt` | `number \| undefined` | Timestamp of last success. |
| `lastErrorAt` | `number \| undefined` | Timestamp of last error. |
| `fetchCount` | `number` | Total completed fetches (any outcome). |
| `retryCount` | `number` | Retry attempt within the current fetch cycle. |
| `maxRetries` | `number` | Configured retry limit. |

### Granular field hooks — avoiding unnecessary re-renders

When a component only needs one field, subscribe to just that field. Re-renders only fire when the subscribed field changes.

```ts
// Only re-renders when isLoading changes
const isLoading = queryAtom.useLoadChange(["users"]);

// Only re-renders when error changes
const err = queryAtom.useErrorChange(["users"]);

// Only re-renders when data changes
const data = queryAtom.useDataChange<User[]>(["users"]);

// Generic: any one field by name
const isFetching = queryAtom.useQueryChange(["users"], "isFetching");
```

Standalone exports are available:
```ts
import { useLoadChange, useErrorChange, useDataChange, useQueryChange } from "@mongez/atomic-query";
```

### Suspense mode

Use `useSuspenseQuery` when you want React to suspend the subtree until the query resolves. Wrap the consumer in both `<Suspense>` and `<ErrorBoundary>`.

```tsx
import { useSuspenseQuery } from "@mongez/atomic-query";

function UserList() {
  // `data` is typed as T (never undefined) — no loading guard needed
  const { data } = useSuspenseQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      fetch("/api/users", { signal }).then(r => r.json()),
  });
  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// In the parent:
<Suspense fallback={<Spinner />}>
  <ErrorBoundary fallback={<p>Failed to load</p>}>
    <UserList />
  </ErrorBoundary>
</Suspense>
```

### Non-React subscription

```ts
const sub = queryAtom.onQueryChange(["users"], (next, prev) => {
  // `next` is undefined when the query is destroyed
  // `prev` is undefined on the very first transition (idle → loading)
  console.log(next?.data);
});
// Later:
sub.unsubscribe();
```

Standalone export:
```ts
import { invalidate, getData, getQuery } from "@mongez/atomic-query";
```

## Key details / Pitfalls

- **`isLoading` vs `isFetching`**: `isLoading` is `true` only on the initial fetch when there is no data yet. `isFetching` is `true` on every fetch including background refetches. Use `isLoading` for skeleton screens; use `isFetching` for a "refreshing" indicator on top of existing content.

- **Query key hashing**: Keys are serialised to canonical JSON with sorted object keys. `["users", { role: "admin", active: true }]` and `["users", { active: true, role: "admin" }]` hash to the **same** entry. `["users", "1|2"]` and `["users", 1, 2]` are **different** entries.

- **`staleTime: 0` (default)**: Data is always considered stale, so every mount triggers a refetch. Set `staleTime` to a positive number when you want to skip refetch for fresh data.

- **`watch: false`**: The component gets a one-shot snapshot but does not subscribe. The query still loads and updates in the background; the component just does not re-render. Useful for "fire and read once" patterns.

- **`queryFn` is always up-to-date**: The hook stores a ref to `queryFn` and updates it on every render. Refetches (background, on-focus, etc.) always run the latest closure — no stale prop or state captured inside the fetcher.

- **AbortSignal usage**: Always pass the provided `signal` to `fetch()`. The signal is cancelled when the component unmounts mid-fetch or when a newer fetch supersedes the current one.

- **Auto-GC**: Starts automatically on the first `useQuery` call. Default: runs every 60 seconds, removes entries unobserved for more than 5 minutes, caps cache at 100 entries.
