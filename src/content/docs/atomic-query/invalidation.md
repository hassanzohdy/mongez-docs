---
title: "Invalidation"
name: mongez-atomic-query-invalidation
description: |
  How to invalidate cached queries (prefix and exact match), refetch on demand, seed from a server loader, and manage cache lifecycle (GC, destroy, stats).
sidebar:
  order: 50
---

## How to use

### invalidate — force a refetch

```ts
import { queryAtom } from "@mongez/atomic-query";

// Prefix match: invalidates ["users"], ["users", 1], ["users", 1, "profile"], …
await queryAtom.invalidate({ queryKey: ["users"] });

// Exact match only: invalidates only ["users", 1]
await queryAtom.invalidate({ queryKey: ["users", 1], exact: true });

// Every query in the cache
await queryAtom.invalidateAll();
```

Invalidation refetches in the background ("silent" mode) — the UI does not flash a loading state for data that is already present.

### Background variants (fire-and-forget)

Use these when you do not need to await the refetch (e.g. in an analytics event handler or a non-critical side effect).

```ts
// Fire-and-forget — scheduled via requestIdleCallback
queryAtom.invalidateBackground({ queryKey: ["users"] });
queryAtom.invalidateBackground({ queryKey: ["users", 1], exact: true });
queryAtom.invalidateBackgroundAll();
```

Standalone exports are available for all four functions:
```ts
import { invalidate, invalidateAll, invalidateBackground, invalidateBackgroundAll } from "@mongez/atomic-query";
```

### Common pattern: invalidate after mutation

```ts
const createPost = useMutation<Post, { title: string }>({
  mutationFn: ({ title }, { signal }) =>
    fetch("/api/posts", { method: "POST", body: JSON.stringify({ title }), signal })
      .then(r => r.json()),

  onSuccess: (post) => {
    // Add the new record immediately (no re-fetch needed for the list itself)
    queryAtom.push(["posts"], post);
  },

  onSettled: () => {
    // Always re-sync aggregates after any outcome
    queryAtom.invalidate({ queryKey: ["posts", "stats"] });
    queryAtom.invalidate({ queryKey: ["dashboard"] });
  },
});
```

### Manual refetch outside React

Use `refetchQuery` / `refetchMultipleQueries` when you need to await the result:

```ts
import { refetchQuery, refetchMultipleQueries } from "@mongez/atomic-query";

// Throws if the query is not in the cache
await refetchQuery(["users"]);

// Parallel
await refetchMultipleQueries([["users"], ["posts"]]);
```

Fire-and-forget variants (from outside components):
```ts
queryAtom.refetchQueryBackground(["users"]);
queryAtom.refetchMultipleQueriesBackground([["users"], ["posts"]]);
```

### How key matching works

Keys are serialised to canonical JSON with sorted object keys. Prefix matching is **segment-aware**: a prefix matches if the target key starts with the same sequence of complete JSON elements.

```
Invalidating ["users", 1] matches:
  ["users", 1]                 ✓  (exact)
  ["users", 1, "profile"]      ✓  (extends the prefix)
  ["users", 1, { role: "admin" }]  ✓

Does NOT match:
  ["users", 10]                ✗  (10 ≠ 1 at that position)
  ["users", 100]               ✗
  ["posts"]                    ✗
```

Object key order inside a key element does not affect matching:
```ts
["users", { role: "admin", active: true }]
// is the same cache entry as
["users", { active: true, role: "admin" }]
```

### Seeding the cache from a server loader

`seedQuery` writes a pre-fetched value into the cache synchronously. A `useQuery` consumer that mounts afterwards will skip the on-mount refetch as long as the data is still within `staleTime`.

```ts
// Directly (e.g. in a Remix loader boundary):
import { seedQuery } from "@mongez/atomic-query";
seedQuery({ queryKey: ["users"], data: usersFromServer });

// With a freshness window:
seedQuery({ queryKey: ["users"], data: usersFromServer, freshFor: 60_000 });
```

`<HydrateQueries>` is the React wrapper (for Next.js App Router server components):
```tsx
import { HydrateQueries } from "@mongez/atomic-query";

export default async function Page() {
  const users = await db.users.findMany();
  return (
    <HydrateQueries entries={[{ queryKey: ["users"], data: users, freshFor: 60_000 }]}>
      <UserListClient />
    </HydrateQueries>
  );
}
```

### Cache lifecycle management

```ts
// Read
queryAtom.getQuery(["users"]);    // Query | undefined
queryAtom.getData(["users"]);     // T | undefined (just the data field)
queryAtom.isStale(["users"], 60_000);  // boolean

// Remove
queryAtom.destroyQuery(["users"]);  // removes + aborts in-flight fetch
queryAtom.clearCache();             // wipe all entries, abort all in-flight fetches

// GC
queryAtom.garbageCollect(300_000);  // remove entries unobserved for > 5 min; returns count removed
queryAtom.limitCacheSize(50);       // remove least-recently-accessed until ≤ 50 entries; returns count removed

// Stats
const stats = queryAtom.getCacheStats();
// { totalQueries, loadingQueries, errorQueries, successfulQueries, totalDataSize }
```

### Auto-GC

Auto-GC starts automatically on the first `useQuery` call with these defaults:
- Interval: every 60 seconds.
- Evict entries unobserved for more than 5 minutes.
- Cap cache at 100 entries.

Override the defaults (call before or after the first `useQuery`):
```ts
const stopGC = queryAtom.setupAutoGC(
  30_000,   // interval ms
  120_000,  // gcTime ms (unobserved threshold)
  200,      // maxQueries
);
// Stop it:
stopGC();
```

Standalone export:
```ts
import { setupAutoGC, garbageCollect, limitCacheSize, getCacheStats, destroyQuery, clearCache } from "@mongez/atomic-query";
```

## Key details / Pitfalls

- **`invalidate` refetches silently.** Active consumers do not see `isLoading: true` during a background invalidation refetch — only `isFetching: true`. This preserves the current data on screen while the refresh runs.

- **`refetchQuery` throws if the key is not in the cache.** This is intentional — it signals a programming error (refetching something that was never mounted). Use `queryAtom.getQuery(key)` to guard if the key may not exist.

- **Segment-aware matching is strict.** `["users", 1]` does NOT match `["users", 10]` or `["users", 100]`. The match requires each JSON element at every position to be identical, and the target key must start with (or equal) the full prefix array.

- **`freshFor` in `seedQuery`/`HydrateQueries`**: sets `staleTime` on the seeded entry. A consumer's own `staleTime` option overrides this once the query is mounted. Use `Infinity` to completely suppress the on-mount refetch for seeded data.

- **`destroyQuery` vs clearing from GC**: `destroyQuery` removes the entry immediately and aborts the in-flight fetch. GC removes entries that have had no observers for longer than `gcTime`. Use `destroyQuery` when you want instant removal (e.g. logout); let GC handle routine cleanup.

- **`clearCache()` aborts all in-flight fetches.** Any components still mounted that own queries will re-enter the `idle` state. They will re-fetch on their next render cycle or when next observed.
