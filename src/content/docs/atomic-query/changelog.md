---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

## 0.1.0 — Unreleased (initial publish candidate)

This package was previously prototyped against a personal project and never released. The 0.1.0 release candidate is a near-rewrite that fixes correctness bugs in the prototype, marks the package client-only, and ships the test suite that wasn't there before.

### Fixed

- **Five public actions stack-overflowed on first call**. `queryAtom.clearCache()`, `queryAtom.getCacheStats()`, `queryAtom.garbageCollect()`, `queryAtom.limitCacheSize()`, `queryAtom.setupAutoGC()` each delegated to a same-named import via `export function X(...) { return X(...); }` — the local export shadowed the import and the function called itself recursively. Now the imports are aliased (e.g. `engineClearCache`) and the wrappers delegate correctly.
- **`invalidate` matched siblings whose hash shared a string prefix**. `invalidate({ queryKey: ["users", 1] })` falsely matched `["users", 10]`, `["users", 100]`, etc., because the implementation used a raw `key.startsWith(...)` on the pipe-joined hash. Replaced with `matchesQueryPrefix`: requires either exact equality or a JSON-array boundary (`,`) after the prefix, so `["users",1]` matches `["users",1]` and `["users",1,...]` but never `["users",10]`.
- **Concurrent same-key fetches issued duplicate network calls**. Three components mounting `useQuery({ queryKey: ["users"], queryFn })` in the same render triggered three fetches. The "already loading" guard inside `loadQuery` read from a closed-over clone of the query — all three calls saw `state: "idle"`. Now an `inFlight: Map<hashKey, Promise>` deduplicates: concurrent calls join the existing promise.
- **`useQuery` mutated global state inside the `useState` initializer**. Setting up the initial query record inside a render-phase initializer broke Strict Mode (created twice) and Suspense retries. The query is now created in a `useEffect`; the hook subscribes via `useSyncExternalStore` and returns a stable per-key placeholder on the first paint.
- **`use*` hooks returned closure variables instead of subscribed state**. `const [, setX] = useState(query[changeType]); return query[changeType]` — only re-rendered by accident on the next render. Replaced with proper `useSyncExternalStore` slices.
- **`onQueryChange` missed first-create and destroy transitions**. The previous gate `oldQuery && newer.lastModified > oldQuery.lastModified` required a previous entry, so the initial `undefined → loading → success` arc and the `Query → undefined` destroy never fired the callback. Now fires whenever the slice reference changes.
- **Hash collisions in `parseQueryKey`**. The pipe-joined serializer collided on `["users", "1|2"]` vs. `["users", 1, 2]`, and was insensitive to object-key ordering when it shouldn't have been. Replaced with canonical JSON (sorted object keys); collisions are gone, ordering differences canonicalize, and partial invalidation gains a clean boundary character (`,`).
- **Stale `queryFn` closure on refetch**. The cached query stored the very first `queryFn` it ever saw. If consumers re-rendered with a new closure capturing fresh props/state, refetches still ran the original — producing stale results from a manual `refetchQuery`. Now the hook registers the latest `queryFn` per hash in a registry; refetches read from there.
- **`isLoading` was conflated with `isFetching`**. Background refetches flashed loading spinners that should only have shown for first fetches. Split into two booleans; first-fetch UI uses `isLoading`, refresh indicators use `isFetching`.
- **`removeAll` was misleadingly named — it didn't mutate**. Previously returned a filtered copy without committing. Behavior preserved (still pure) but the surrounding helpers (`remove`, `removeByIndex`, `push`, `pop`, `unshift`, `shift`, `replace`, `clear`, `sort`, `reverse`) all properly mutate. New array-helper layer is uniformly immutable internally; `removeAll` is no longer exported as it's the only non-mutating sibling.
- **Cache subscribers woke up on every update of every query**. `useQuery` subscribed to `queryAtom.onChange` (whole atom). With 50 mounted queries, every refetch fired 50 callbacks. Per-key subscriptions now wake only the consumers of the specific slice that changed.
- **`destroyQuery` didn't abort in-flight fetches or clean up the latest-`queryFn` registry**. Now does both.
- **`garbageCollect` evicted actively-used queries**. Used `lastModified` (set on refetch) instead of `lastAccessed` (set on observer attach). A query read by 10 components but never refetched got GC'd. Now uses `lastAccessed` AND observer count: only zero-observer queries are eligible for eviction.

### Added

- **`useInfiniteQuery`**. Paginated/cursor queries with `fetchNextPage()`, `hasNextPage`, `isFetchingNextPage`. Cached as `{ pages: TPage[]; pageParams: TPageParam[] }` so invalidation, GC, and refetch-on-focus work for free; `getNextPageParam` computes the cursor for the next fetch.
- **`useSuspenseQuery`**. Thin Suspense wrapper over `useQuery` — throws a promise while loading, throws the error when failed, returns the query with `data: T` when settled. Initializes the cache synchronously during render so the fetch actually fires even when the component suspends from first render.
- **`useMutation`**. Imperative side-effect hook with `mutate` / `mutateAsync` / `reset` / `data` / `error` / `variables` / `status` / `isPending` / `isError` / `isSuccess` / `isIdle`, plus `onMutate` / `onSuccess` / `onError` / `onSettled` lifecycle. A second `mutate` aborts the first; unmount aborts the in-flight call.
- **`seedQuery` + `<HydrateQueries>`**. SSR integration via the framework loader: pre-populate the cache with data fetched by your framework (Next.js server component, Remix `loader`, TanStack Start `loader`). Consumers see seeded data on first paint with no flash and no refetch as long as it's fresh.
- **`AbortSignal` propagation**. Every `queryFn` and `mutationFn` receives `{ signal }`. A new fetch for the same key aborts the previous one; `destroyQuery` aborts; mutations abort on second-call or unmount.
- **Reference-counted GC**. `useQuery` attaches/detaches observers. `garbageCollect` only evicts queries with zero observers AND a stale `lastAccessed`. Auto-started on the first `useQuery` — no manual `setupAutoGC()` required.
- **Granular subscription hooks**. `useLoadChange`, `useErrorChange`, `useDataChange`, `useQueryChange(key, "isFetching")`. Each subscribes to a single field; re-renders only when that field changes.
- **Client-only enforcement**. Every file `"use client"`. Package exports map: `"react-server": null`. Bundlers refuse to load this from a React Server Component.
- **Test suite**. 41 unit tests across `hash`, `actions`, `hooks`, `mutation`. Specifically guards against regression on: self-recursion, segment-boundary invalidation, hash collisions, concurrent fetch dedup, Strict Mode double-create, queryFn freshness, abort behavior.
- **CI**. Node 18/20/22 × Ubuntu, Node 20 × Windows, React 18 + React 19.
- **AI kit**. `llms.txt`, `llms-full.txt`, `skills/` (`README`, `overview`, `queries`, `mutations`, `cache`, `list-helpers`, `ssr`).
- **README**. Marketing-style with framework integration examples and a migration-from-TanStack-Query map.

### Changed (breaking — though no prior release to break)

- **`isLoading` is now first-fetch only**. Background refetches set `isFetching: true` without touching `isLoading`. Any UI that used `isLoading` for background spinners should switch to `isFetching`.
- **`Query.data` is `T | undefined`**, not `T`. The runtime always treated it as `null` initially; the type now honestly admits that.
- **`queryFn` signature is `(ctx: { signal: AbortSignal }) => Promise<T>`**, not `() => Promise<T>`. The signal is non-optional in the type but consumers are free to ignore it.
- **`Query.onSuccess` / `onError` fire with the post-update query**, not the pre-update one. The callback receives the latest snapshot via a re-read of the cache after `lastModified` is bumped.
- **`updateQueryData<T>(key, updater)`** receives `T | undefined` (was `T`). Reflects that updaters can run before the first fetch resolves.
- **`onQueryChange` callback receives `Query | undefined`** for both arguments. The previous signature assumed both sides were defined.
- **List helpers no-op on `undefined`**. `queryAtom.push(["users"], item)` on a not-yet-loaded query now produces `[item]` instead of throwing.
- **`destroyQuery(key)` now aborts in-flight fetches**, where the old version left them running and only deleted the cache entry.

### Removed

- **The five self-recursive wrapper exports** (`clearCache`, `getCacheStats`, `garbageCollect`, `limitCacheSize`, `setupAutoGC` from the old `query-actions.ts`). The new wrappers delegate correctly to engine implementations.
- **Pipe-joined hash format**. Anything that read raw `hashKey` strings will break — they're now JSON. Use `parseQueryKey(queryKey)` to compute a hash if you need one.
- **`removeAll` from the array helpers**. It was the only non-mutating sibling and confused callers. Use `queryAtom.updateQueryData(key, old => (old ?? []).filter(x => x !== item))` or `queryAtom.remove(key, item)`.

### Tests

```
41 + 4 infinite + 2 suspense = 47 passing
```
