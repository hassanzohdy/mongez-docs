---
title: "List Queries"
name: mongez-atomic-query-list-queries
description: |
  Built-in array helpers (push, unshift, pop, shift, replace, remove, removeByIndex, clear, sort, reverse) for queries that hold a list, plus useInfiniteQuery for cursor/page-based pagination.
  TRIGGER when: code imports `push`, `unshift`, `pop`, `shift`, `replace`, `remove`, `removeByIndex`, `clear`, `sort`, `reverse`, `useInfiniteQuery`, `updateQueryData`, `fetchNextPage`, or `getNextPageParam` from `@mongez/atomic-query`; user asks "how do I work with a list-shaped query / append after create / remove after delete / paginate / load more"; typical import `import { queryAtom, useInfiniteQuery, push } from "@mongez/atomic-query"`.
  SKIP: pure array-helper reference (no pagination context) — use `mongez-atomic-query-list-helpers`; deep `useInfiniteQuery` mechanics only — use `mongez-atomic-query-infinite`; non-list `useQuery` calls — use `mongez-atomic-query-basic-query` or `mongez-atomic-query-queries`; write-side `useMutation` hooks — use `mongez-atomic-query-mutations`.
sidebar:
  order: 50
---

## When to use

Use this skill when:
- Someone wants to append a new record to a list after a successful mutation.
- Someone wants to remove a record from the list cache after a delete operation.
- Someone wants to update one item inside a list without refetching.
- Someone is implementing an infinite-scroll or load-more pattern.
- Someone asks about `useInfiniteQuery`, `fetchNextPage`, or `hasNextPage`.
- Someone asks about any of these helpers: `push`, `unshift`, `pop`, `shift`, `replace`, `remove`, `removeByIndex`, `clear`, `sort`, `reverse`.

## How to use

### Array helpers reference

All helpers live on `queryAtom` and are also exported as standalone functions.

```ts
import { queryAtom } from "@mongez/atomic-query";
// — or standalone imports:
import { push, unshift, pop, shift, replace, remove, removeByIndex, clear, sort, reverse } from "@mongez/atomic-query";
```

| Method | Signature | What it does |
|---|---|---|
| `push` | `(key, item)` | Append one item to the end. |
| `unshift` | `(key, item)` | Prepend one item to the start. |
| `pop` | `(key)` | Remove the last item. |
| `shift` | `(key)` | Remove the first item. |
| `replace` | `(key, index, item)` | Replace the item at `index`. |
| `removeByIndex` | `(key, index)` | Remove the item at `index`. |
| `remove` | `(key, item)` | Remove every occurrence by strict equality. |
| `clear` | `(key)` | Empty the list. |
| `sort` | `(key, compareFn)` | Sort into a new array and commit. |
| `reverse` | `(key)` | Reverse into a new array and commit. |

Every helper is **immutable** — it never mutates the stored array in place. It calls `queryAtom.updateQueryData` internally and produces a single atomic cache write.

Every helper is a **no-op when the query has not yet loaded** (data is `undefined`). It is safe to call optimistically before the initial fetch has completed.

### Common patterns

**Append after create:**
```ts
const createPost = useMutation<Post, { title: string }>({
  mutationFn: ({ title }, { signal }) =>
    fetch("/api/posts", { method: "POST", body: JSON.stringify({ title }), signal })
      .then(r => r.json()),

  onSuccess: (newPost) => {
    queryAtom.push(["posts"], newPost);
  },
});
```

**Prepend (new item at top):**
```ts
onSuccess: (newPost) => {
  queryAtom.unshift(["posts"], newPost);
},
```

**Remove after delete:**
```ts
const deletePost = useMutation<void, number>({
  mutationFn: (id, { signal }) =>
    fetch(`/api/posts/${id}`, { method: "DELETE", signal }).then(r => r.json()),

  onSuccess: (_data, id) => {
    queryAtom.removeByIndex(
      ["posts"],
      // find the index first using getData
      (queryAtom.getData(["posts"]) as Post[] ?? []).findIndex(p => p.id === id),
    );
  },
});
```

Or with `updateQueryData` (more flexible):
```ts
onSuccess: (_data, id) => {
  queryAtom.updateQueryData<Post[]>(["posts"], old =>
    (old ?? []).filter(p => p.id !== id)
  );
},
```

**Replace one record after update:**
```ts
onSuccess: (updated) => {
  queryAtom.replace(
    ["posts"],
    (queryAtom.getData(["posts"]) as Post[] ?? []).findIndex(p => p.id === updated.id),
    updated,
  );
},
```

**Sort alphabetically:**
```ts
queryAtom.sort(["posts"], (a, b) => a.title.localeCompare(b.title));
```

### Infinite / paginated queries — useInfiniteQuery

```tsx
"use client";
import { useInfiniteQuery } from "@mongez/atomic-query";

function PostFeed() {
  const q = useInfiniteQuery<PostPage, number>({
    queryKey: ["posts", "feed"],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetch(`/api/posts?cursor=${pageParam}`, { signal }).then(r => r.json()),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined, // return undefined = no more pages
  });

  const posts = q.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <>
      {q.isLoading && <Spinner />}
      <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
      <button
        disabled={!q.hasNextPage || q.isFetchingNextPage}
        onClick={() => q.fetchNextPage()}
      >
        {q.isFetchingNextPage ? "Loading…" : q.hasNextPage ? "Load more" : "All loaded"}
      </button>
    </>
  );
}
```

#### useInfiniteQuery options

```ts
useInfiniteQuery<TPage, TPageParam>({
  queryKey: QueryKey;
  initialPageParam: TPageParam;        // param used for the first fetch
  queryFn: ({ pageParam, signal }) => Promise<TPage>;
  getNextPageParam: (lastPage, allPages, lastPageParam, allPageParams) =>
    TPageParam | undefined;            // return undefined = no more pages
  // All standard useQuery options also apply:
  staleTime?, gcTime?, retry?, refetchOnMount?, refetchOnWindowFocus?, refetchOnReconnect?
})
```

#### useInfiniteQuery return shape

Extends the standard `Query<InfiniteQueryData<TPage, TPageParam>>` with:

| Field | Type | Meaning |
|---|---|---|
| `data.pages` | `TPage[]` | All pages fetched so far, in arrival order. |
| `data.pageParams` | `TPageParam[]` | The param used to fetch each page. |
| `hasNextPage` | `boolean` | `getNextPageParam` returned a non-undefined value for the last page. |
| `isFetchingNextPage` | `boolean` | `fetchNextPage()` is currently in flight. |
| `fetchNextPage` | `() => Promise<void>` | Fetch the next page and append it. |

#### Invalidating an infinite query

`queryAtom.invalidate({ queryKey: ["posts", "feed"] })` triggers a full refetch **starting from page 1** (the regular `queryFn` runs with `initialPageParam`). The pages array is reset to a single-page result. If you want to keep existing pages and just append, use `queryAtom.push` or `queryAtom.updateQueryData` directly.

## Key details / Pitfalls

- **All array helpers use `updateQueryData` internally.** If you need to do something none of the helpers cover, use `queryAtom.updateQueryData` directly — it has the same atomicity guarantee.

- **`remove(key, item)` uses strict equality (`!==`).** For objects this means reference equality, not deep equality. For removing by a property (e.g. by `id`), use `removeByIndex` after a `findIndex`, or use `updateQueryData` with a `.filter()`.

- **`sort` and `reverse` create a new array** — they do not mutate the stored array. The update is committed as a single cache write.

- **Optimistic list mutations are safe before the first fetch.** All helpers treat `undefined` as an empty array (`[]`), so `queryAtom.push(["posts"], draft)` before the query has loaded still works without throwing.

- **`useInfiniteQuery` is built on top of `queryAtom.useQuery`.** The cached value is `{ pages: TPage[], pageParams: TPageParam[] }`, not a flat array. All cache operations (invalidation, GC, observer counts, refetch-on-focus) work the same way as a regular query.

- **No `getNextPageParam` equivalent for previous pages.** Bidirectional pagination is not yet supported. Model bidirectional lists by maintaining your own page state and fetching directly.
