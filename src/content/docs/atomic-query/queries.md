---
title: "Queries (useQuery)"
name: mongez-atomic-query-queries
description: |
  Full reference for queryAtom.useQuery — all options, the Query<T> return shape, retry configuration, window-focus/reconnect refetch, granular field subscriptions, key hashing, and abort behavior.
  TRIGGER when: code imports `useQuery`, `queryAtom`, `useLoadChange`, `useDataChange`, `useErrorChange`, `useQueryChange`, `Query`, `QueryKey`, `QueryState`, or `AddQueryOptions` from `@mongez/atomic-query`; user asks "how does useQuery work / what's in Query<T> / what is staleTime vs gcTime / how does retry / refetchOnWindowFocus work / how are query keys hashed"; typical import `import { queryAtom, useQuery } from "@mongez/atomic-query"`.
  SKIP: quick-start framing for first-time users — use `mongez-atomic-query-basic-query`; suspense-mode behavior — use `mongez-atomic-query-suspense`; write-side mutations — use `mongez-atomic-query-mutations`; invalidation/refetch patterns — use `mongez-atomic-query-invalidation` or `mongez-atomic-query-cache`; cursor/page-based pagination — use `mongez-atomic-query-infinite`.
sidebar:
  order: 20
---

The flagship hook. Reads server state, caches it, deduplicates concurrent calls, retries, and refetches on focus / reconnect / stale.

## Signature

```ts
queryAtom.useQuery<T>(options: AddQueryOptions<T>): Query<T>
```

```ts
type AddQueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: (ctx: { signal: AbortSignal }) => Promise<T>;
  onSuccess?: (data: T, query: Query<T>) => void;
  onError?: (error: any, query: Query<T>) => void;
  watch?: boolean;                                  // default true
  retry?: number;                                   // default 0
  retryDelay?: number | ((attempt: number) => number);
  retryCondition?: (error: any, attempt: number) => boolean;
  staleTime?: number;                               // default 0
  gcTime?: number;                                  // default 5 * 60_000
  refetchOnMount?: boolean;                         // default true
  refetchOnWindowFocus?: boolean;                   // default false
  refetchOnReconnect?: boolean;                     // default false
};
```

## The `Query<T>` shape

| Field | Type | Meaning |
|---|---|---|
| `data` | `T \| undefined` | `undefined` until the first success. |
| `isLoading` | `boolean` | `true` only during the first fetch (no data yet). Use for skeleton loaders. |
| `isFetching` | `boolean` | `true` during any fetch (initial OR background). Use for "refreshing…" indicators. |
| `isError` | `boolean` | Last attempt failed (post-retries). |
| `error` | `unknown \| null` | The error object. |
| `state` | `"idle" \| "loading" \| "error" \| "success"` | Coarse lifecycle. |
| `isRetrying` | `boolean` | Currently waiting between retry attempts. |
| `lastModified`, `lastSuccessAt`, `lastErrorAt` | `number` | Timestamps. |
| `fetchCount`, `retryCount`, `maxRetries` | `number` | Counters. |
| `queryKey`, `hashKey`, `queryFn` | … | Stored on the entry. |

## Patterns

### Basic

```tsx
const { data, isLoading, error } = queryAtom.useQuery<User[]>({
  queryKey: ["users"],
  queryFn: ({ signal }) => fetch("/api/users", { signal }).then(r => r.json()),
  staleTime: 60_000,
});
```

### With dependent key

```tsx
const userId = useParams().id;
const { data } = queryAtom.useQuery<User>({
  queryKey: ["users", userId],
  queryFn: ({ signal }) =>
    fetch(`/api/users/${userId}`, { signal }).then(r => r.json()),
});
```

Changing `userId` swaps the cache entry. The previous entry stays in the cache (eligible for GC).

### With retry

```tsx
queryAtom.useQuery({
  queryKey: ["users"],
  queryFn,
  retry: 3,
  retryDelay: attempt => 1000 * 2 ** attempt,  // 1s, 2s, 4s
  retryCondition: (err, attempt) => {
    return !(err instanceof TypeError);        // don't retry on schema mismatch
  },
});
```

### Window focus / reconnect

```tsx
queryAtom.useQuery({
  queryKey: ["dashboard"],
  queryFn,
  staleTime: 30_000,
  refetchOnWindowFocus: true,    // refetch if stale when tab regains focus
  refetchOnReconnect: true,      // refetch when navigator.online flips back
});
```

### Granular subscriptions

When a component only cares about one field:

```ts
const isLoading = queryAtom.useLoadChange(["users"]);
const data      = queryAtom.useDataChange<User[]>(["users"]);
const error     = queryAtom.useErrorChange(["users"]);
const fetching  = queryAtom.useQueryChange(["users"], "isFetching");
```

Only re-renders when the named field changes — not when sibling fields on the same query change.

### Disabled / paused fetch

```tsx
queryAtom.useQuery({
  queryKey: ["users", filterState],
  queryFn,
  watch: false,    // hook reads the cache but doesn't subscribe / refetch
});
```

## Key hashing

Keys are JSON-hashed with sorted object keys:

- `["users", { role: "admin", active: true }]` and `["users", { active: true, role: "admin" }]` → same entry.
- `["users", "1|2"]` and `["users", 1, 2]` → different entries.

## Concurrent dedup

Three components mounting with the same `queryKey` result in **one** `queryFn` invocation. Subsequent components join the in-flight promise.

## `queryFn` freshness

The hook stashes the latest `queryFn` closure in a registry keyed by hash. Refetches always use the freshest closure — even if the component has re-rendered with different captured props/state since the entry was created.

## Abort behavior

- The `signal` passed to `queryFn` is aborted when:
  - A newer fetch starts for the same key.
  - `queryAtom.destroyQuery(key)` is called.
- The signal is NOT aborted on consumer unmount. Strict Mode and route bounces don't kill in-flight fetches.
