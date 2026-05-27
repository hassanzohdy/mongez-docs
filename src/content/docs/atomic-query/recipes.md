---
title: "Recipes"
name: mongez-atomic-query-recipes
description: |
  Idiomatic composition recipes for `@mongez/atomic-query` — optimistic updates with rollback, list mutation + invalidation, infinite scroll wiring, prefetch on hover, SSR data hand-off via `<HydrateQueries>`, suspense-driven detail pages, and segment-aware cross-query invalidation.
  TRIGGER when: code combines `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `<HydrateQueries>`, or `queryAtom` across more than one component; user asks "show me an end-to-end optimistic update", "how do I prefetch on hover", "SSR hand-off with atomic-query", "infinite scroll integration", or "how do I invalidate multiple queries at once".
  SKIP: single-feature dives — load `mongez-atomic-query-queries`, `mongez-atomic-query-mutations`, `mongez-atomic-query-infinite`, `mongez-atomic-query-invalidation`, `mongez-atomic-query-suspense`, `mongez-atomic-query-ssr`, or `mongez-atomic-query-cache` instead; vanilla `@mongez/atom` state without a server-data layer (use `mongez-atom-recipes`); React-Query interop — patterns translate but the API surface differs.
sidebar:
  order: 99
---

Cross-feature compositions for `@mongez/atomic-query` — the patterns that come up once you've moved past single-fetch boundaries.

## Optimistic update with rollback

You're toggling a like-count on a post. The mutation almost always succeeds, but on failure you want the UI to snap back. Read the current snapshot, apply the optimistic write, mutate, and restore on error.

```ts
import { useMutation, queryAtom } from "@mongez/atomic-query";

function useLikePost(postId: string) {
  return useMutation<Post, void, { previous: Post | undefined }>({
    mutationFn: (_vars, { signal }) => api.posts.like(postId, { signal }),
    onMutate: () => {
      const previous = queryAtom.getData(["post", postId]) as Post | undefined;
      queryAtom.updateQueryData<Post>(["post", postId], p =>
        p ? { ...p, likes: p.likes + 1, likedByMe: true } : (p as Post),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryAtom.updateQueryData<Post>(["post", postId], () => ctx.previous!);
      }
    },
    onSettled: () => queryAtom.invalidate({ queryKey: ["post", postId] }),
  });
}
```

`onSettled` invalidates after both success and error, so the server stays the eventual source of truth.

## Paginated list + delete-an-item without refetching every page

After deleting an item, splice it out of the cached list instead of round-tripping. For a flat list, `removeByIndex` (after a `findIndex`) or `updateQueryData` with `.filter()` does the job — strict-equality `remove` only helps when items compare by reference.

```ts
const deleteTodo = useMutation<void, string>({
  mutationFn: (id, { signal }) =>
    fetch(`/api/todos/${id}`, { method: "DELETE", signal }).then(() => undefined),
  onSuccess: (_data, id) => {
    queryAtom.updateQueryData<Todo[]>(["todos"], old =>
      (old ?? []).filter(t => t.id !== id),
    );
  },
});
```

For an insert-at-top pattern, use `queryAtom.unshift(["todos"], newTodo)`. See `mongez-atomic-query-list-helpers` for the full array-helper surface.

## Infinite scroll with `IntersectionObserver`

A sentinel `<div>` at the end of the list triggers `fetchNextPage` when it scrolls into view — and stops firing when there are no more pages.

```tsx
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@mongez/atomic-query";

function Feed() {
  const q = useInfiniteQuery<FeedPage, number>({
    queryKey: ["feed"],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetch(`/api/feed?cursor=${pageParam}`, { signal }).then(r => r.json()),
    getNextPageParam: last => last.nextCursor ?? undefined,
  });
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current || !q.hasNextPage) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !q.isFetchingNextPage) q.fetchNextPage();
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  return (
    <>
      {q.data?.pages.flatMap(p => p.items).map(item => (
        <FeedItem key={item.id} {...item} />
      ))}
      <div ref={sentinel} />
    </>
  );
}
```

## Prefetch on link hover

By the time the user clicks the link, the destination's data is already in cache. atomic-query doesn't ship a `prefetchQuery` helper — the idiom is: fetch manually, `seedQuery` to drop the result in the cache, then guard on `isStale` so repeated hovers don't refire.

```tsx
import Link from "next/link";
import { queryAtom } from "@mongez/atomic-query";

async function prefetchPost(id: string) {
  if (!queryAtom.isStale(["post", id], 30_000)) return;
  const post = await fetch(`/api/posts/${id}`).then(r => r.json());
  queryAtom.seedQuery({ queryKey: ["post", id], data: post, freshFor: 30_000 });
}

function PostLink({ post }: { post: Post }) {
  return (
    <Link
      href={`/p/${post.id}`}
      onMouseEnter={() => prefetchPost(post.id)}
      onFocus={() => prefetchPost(post.id)}>
      {post.title}
    </Link>
  );
}
```

`freshFor: 30_000` keeps the seeded data warm long enough that navigation doesn't immediately re-fetch.

## SSR data hand-off via `<HydrateQueries>`

Fetch in your framework's loader on the server, emit a JSON payload, hydrate before any `useQuery` runs on the client. First render is synchronous — no loading flash.

```ts
// Server: in a Remix / Next / TanStack Router loader
const user = await api.users.get(req.params.id);
const todos = await api.todos.list({ userId: user.id });
return {
  ssrQueries: [
    { queryKey: ["user", user.id], data: user },
    { queryKey: ["todos", { userId: user.id }], data: todos },
  ],
};
```

```tsx
// Client root
import { HydrateQueries, type SeedEntry } from "@mongez/atomic-query";

function App({ ssrQueries }: { ssrQueries: SeedEntry[] }) {
  return (
    <HydrateQueries entries={ssrQueries}>
      <UserPage />
    </HydrateQueries>
  );
}
```

`queryAtom.useQuery({ queryKey: ["user", id], queryFn })` inside `<UserPage />` returns the hydrated data on first render. Subsequent re-fetches honor the configured `staleTime` / `freshFor`.

## Suspense-driven detail page

The component renders only when data is present — no `if (isLoading) return <Spinner />` ladder inside.

```tsx
import { Suspense } from "react";
import { useSuspenseQuery } from "@mongez/atomic-query";

function PostPage({ id }: { id: string }) {
  const { data: post } = useSuspenseQuery<Post>({
    queryKey: ["post", id],
    queryFn: ({ signal }) =>
      fetch(`/api/posts/${id}`, { signal }).then(r => r.json()),
  });
  return <h1>{post.title}</h1>;
}

function PostRoute({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<NotFound />}>
      <Suspense fallback={<Spinner />}>
        <PostPage id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Loading state lives in the Suspense boundary; error state lives in the ErrorBoundary. The leaf component reads data as if it's always there. Note the order: `ErrorBoundary` must wrap `Suspense` so it catches throws from the suspended subtree.

## Invalidate every query in a segment

After publishing a comment, every cached query whose key starts with `["posts", postId]` (the post detail, its comments list, its reactions) should refetch in one call.

```ts
queryAtom.invalidate({ queryKey: ["posts", postId] });
```

Segment-aware prefix matching is built in — passing the prefix invalidates every descendant key in one shot. `["posts", 1]` matches `["posts", 1, "comments"]` and `["posts", 1, "reactions"]` but **not** `["posts", 10]`. To invalidate the post itself but leave its comments cached, narrow with `exact: true`:

```ts
queryAtom.invalidate({ queryKey: ["posts", postId], exact: true });
```

## Pair with `@mongez/http` for the fetch layer

`atomic-query` doesn't dictate how you make HTTP calls. A common pairing:

```ts
import { http } from "@mongez/http";
import { queryAtom } from "@mongez/atomic-query";

const queries = {
  post: (id: string) => ({
    queryKey: ["post", id] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const { data, error } = await http.get<Post>(`/posts/${id}`, { signal });
      if (error) throw error;
      return data;
    },
  }),
};

// At the call site
const { data } = queryAtom.useQuery(queries.post(postId));
```

The `{data, error}` shape from `@mongez/http` maps cleanly: throw on error so atomic-query's `isError` / `error` slots activate; return on success so `data` populates. Centralising the query definitions (`queries.post(id)`) keeps `queryKey` and `queryFn` paired in one place — and propagating `signal` into `http.get` lets atomic-query cancel stale requests.
