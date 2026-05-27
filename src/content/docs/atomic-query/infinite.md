---
title: "Infinite / paginated queries"
name: mongez-atomic-query-infinite
description: |
  How to use useInfiniteQuery for cursor-based and offset-based paginated lists, including fetchNextPage, hasNextPage, and invalidation behavior.
  TRIGGER when: code imports `useInfiniteQuery`, `InfiniteQueryData`, `InfiniteQueryFnContext`, `UseInfiniteQueryOptions`, or `UseInfiniteQueryResult` from `@mongez/atomic-query`, or calls `fetchNextPage`, `getNextPageParam`, `hasNextPage`, or `isFetchingNextPage`; user asks "how do I implement infinite scroll / load more / cursor pagination / offset pagination"; typical import `import { useInfiniteQuery } from "@mongez/atomic-query"`.
  SKIP: single-page `useQuery` calls — use `mongez-atomic-query-basic-query` or `mongez-atomic-query-queries`; mutating cached array values via `push`/`unshift`/`remove`/`sort` — use `mongez-atomic-query-list-helpers`; write-side mutations — use `mongez-atomic-query-mutations`.
sidebar:
  order: 40
---

`useInfiniteQuery` is the cursor-paginated cousin of `useQuery`. The cached value is `{ pages, pageParams }` — an array of fetched pages and the cursor used for each. Each call to `fetchNextPage()` computes the next cursor via `getNextPageParam` and appends the result.

Built on top of `queryAtom.useQuery`, so cache invalidation, GC, observer counting, and refetch-on-focus all work for free.

## Signature

```ts
function useInfiniteQuery<TPage, TPageParam>(
  options: UseInfiniteQueryOptions<TPage, TPageParam>,
): UseInfiniteQueryResult<TPage, TPageParam>

type UseInfiniteQueryOptions<TPage, TPageParam> = Omit<AddQueryOptions<...>, "queryFn"> & {
  queryFn: (ctx: { pageParam: TPageParam; signal: AbortSignal }) => Promise<TPage>;
  initialPageParam: TPageParam;
  getNextPageParam: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: TPageParam,
    allPageParams: TPageParam[],
  ) => TPageParam | undefined;
};

type UseInfiniteQueryResult<TPage, TPageParam> = Query<{
  pages: TPage[];
  pageParams: TPageParam[];
}> & {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<void>;
};
```

## Behavior

- **First fetch.** Standard `useQuery`-style: runs `queryFn({ pageParam: initialPageParam, signal })` and wraps the result in `{ pages: [page], pageParams: [initialPageParam] }`.
- **`fetchNextPage()`** computes the next param via `getNextPageParam`, fetches, and appends to both `pages` and `pageParams`. Each call has its own `AbortController` so multiple in-flight page fetches can be aborted independently.
- **`hasNextPage`** is `true` when `getNextPageParam(lastPage, ...)` returns a non-`undefined`, non-`null` value.
- **`isFetchingNextPage`** is local to the hook — separate from the cached query's `isFetching` (which reflects whole-query refetches like invalidation).
- **Invalidation** of the query key refetches starting from page 1; the `pages` array shrinks back to length 1.

## Examples

### Cursor-based pagination

```tsx
type Page = { items: Post[]; nextCursor: number | null };

const q = useInfiniteQuery<Page, number>({
  queryKey: ["posts"],
  queryFn: ({ pageParam, signal }) =>
    fetch(`/api/posts?cursor=${pageParam}`, { signal }).then(r => r.json()),
  initialPageParam: 0,
  getNextPageParam: last => last.nextCursor ?? undefined,
});

// Flatten for rendering:
const allPosts = q.data?.pages.flatMap(p => p.items) ?? [];

return (
  <>
    {allPosts.map(p => <Post key={p.id} post={p} />)}
    <button
      disabled={!q.hasNextPage || q.isFetchingNextPage}
      onClick={() => q.fetchNextPage()}>
      {q.isFetchingNextPage ? "Loading…" : q.hasNextPage ? "Load more" : "No more"}
    </button>
  </>
);
```

### Offset-based pagination

```tsx
const q = useInfiniteQuery<Page, number>({
  queryKey: ["users", "page"],
  queryFn: ({ pageParam, signal }) =>
    fetch(`/api/users?offset=${pageParam}&limit=20`, { signal }).then(r => r.json()),
  initialPageParam: 0,
  getNextPageParam: (lastPage, allPages) => {
    if (lastPage.items.length < 20) return undefined; // no more
    return allPages.length * 20;
  },
});
```

### Stop condition based on total

```tsx
type Page = { items: Item[]; total: number };

const q = useInfiniteQuery<Page, number>({
  queryKey: ["items"],
  queryFn: ({ pageParam, signal }) => fetchItems(pageParam, signal),
  initialPageParam: 1,
  getNextPageParam: (last, allPages, lastParam) => {
    const fetched = allPages.reduce((sum, p) => sum + p.items.length, 0);
    if (fetched >= last.total) return undefined;
    return lastParam + 1;
  },
});
```

### Invalidation refetches from page 1

```ts
queryAtom.invalidate({ queryKey: ["posts"] });
// → next render runs queryFn with initialPageParam again, pages array
//   resets to length 1.
```

If you want a "soft refresh" that keeps prior pages but refetches them, build it yourself:

```ts
// rough sketch
const current = queryAtom.getData(["posts"]);
if (!current) return;
for (const param of current.pageParams) {
  // refetch each page param
}
```

## Gotchas

- **`getNextPageParam` returning `undefined` vs `null`.** Both stop pagination; pick whichever your API returns naturally.
- **`fetchNextPage()` while already fetching.** Calling it twice in quick succession spawns a second controller and a second request — the first one isn't aborted. If you want to debounce, wrap the call site.
- **`pages` grows unbounded.** For very long feeds, consider virtualizing the render and trimming the `pages` array when the user scrolls back to the top.
- **Cache invalidation resets the pagination.** If you `invalidate({ queryKey: ["posts"] })`, you get one fresh page. To preserve scroll position you'll need a custom pattern.
