---
title: "Cache management"
name: mongez-atomic-query-cache
description: |
  All cache management operations in @mongez/atomic-query — invalidation, refetch, optimistic writes, seeding, direct reads, destruction, GC, and non-React subscriptions.
sidebar:
  order: 60
---

Operations on the cache itself — invalidation, refetch, optimistic writes, lifecycle.

## Invalidation

```ts
queryAtom.invalidate({ queryKey, exact?: boolean }): Promise<void>
queryAtom.invalidateAll(): Promise<void>
queryAtom.invalidateBackground({ queryKey }): void           // requestIdleCallback
queryAtom.invalidateBackgroundAll(): void
```

**Matching is segment-aware.** `invalidate({ queryKey: ["users", 1] })` matches:

- `["users", 1]` ✓ (exact)
- `["users", 1, "profile"]` ✓ (child)

But NOT:

- `["users", 10]` ✗
- `["users", 100]` ✗

Internally: queries are hashed via canonical JSON; prefix matching requires a `,` boundary after the parent's last element, so `["users",1]` and `["users",10]` differ at position 9.

`exact: true` only refetches the literal hash match.

## Refetch

```ts
queryAtom.refetchQuery(queryKey): Promise<void>                    // throws if missing
queryAtom.refetchMultipleQueries(queryKey[]): Promise<void>
queryAtom.refetchQueryBackground(queryKey): void
queryAtom.refetchMultipleQueriesBackground(queryKey[]): void
```

Refetches share the in-flight dedup map — calling `refetchQuery(key)` while a fetch is already running for that key joins the existing promise.

## Optimistic writes

```ts
queryAtom.updateQueryData<T>(queryKey, (old: T | undefined) => T): void
```

Replaces the cached value without triggering a refetch. Subscribers re-render. Use inside `onMutate` for optimistic patterns; pair with `invalidate` in `onSettled` to re-sync.

## Seeding

```ts
queryAtom.seedQuery<T>({ queryKey, data, freshFor?: number }): void
```

Inserts a `state: "success"` entry into the cache. Consumers see it on first read, no refetch unless stale per `freshFor` / `staleTime`. The React wrapper is `<HydrateQueries>`.

## Direct reads

```ts
queryAtom.getQuery(queryKey): Query | undefined
queryAtom.getData(queryKey): unknown
queryAtom.isStale(queryKey, staleTime?): boolean
```

## Destruction

```ts
queryAtom.destroyQuery(queryKey): void
```

Removes the entry from the cache AND aborts any in-flight fetch for that key. Idempotent — no-op for unknown keys.

```ts
queryAtom.clearCache(): void
```

Wipes everything and aborts every in-flight fetch.

## Stats and GC

```ts
queryAtom.getCacheStats(): {
  totalQueries: number;
  loadingQueries: number;
  errorQueries: number;
  successfulQueries: number;
  totalDataSize: number;
}

queryAtom.garbageCollect(gcTime?: number): number    // returns count removed
queryAtom.limitCacheSize(maxQueries?: number): number

queryAtom.setupAutoGC(
  interval?: number,    // default 60_000 ms
  gcTime?: number,      // default 5 * 60_000 ms
  maxQueries?: number,  // default 100
): () => void   // returns stop function
```

`setupAutoGC` is called automatically on the first `useQuery` so consumers don't need to remember it. The default cadence is "every minute, evict anything unobserved for more than 5 minutes."

**GC respects observer counts.** A query with mounted consumers is never GC'd, even if its data is old. Only queries with zero observers (since `gcTime` ms ago) get evicted.

## Subscribing without a hook

```ts
queryAtom.onQueryChange(
  queryKey,
  (next: Query | undefined, prev: Query | undefined) => void,
): EventSubscription
```

Fires on **every** slice change for the named key — including create (`prev === undefined`) and destroy (`next === undefined`). Returns `{ unsubscribe }`.
