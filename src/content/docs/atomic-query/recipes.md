---
title: "Recipes"
name: mongez-atomic-query-recipes
description: |
  Idiomatic composition recipes for `@mongez/atomic-query` — optimistic updates with rollback, list mutation + invalidation, infinite scroll wiring, prefetch on hover, SSR data hand-off via `<HydrateQueries>`, suspense-driven detail pages, and segment-aware cross-query invalidation.
  TRIGGER when: code combines `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `<HydrateQueries>`, or `queryClient` across more than one component; user asks "show me an end-to-end optimistic update", "how do I prefetch on hover", "SSR hand-off with atomic-query", "infinite scroll integration", or "how do I invalidate multiple queries at once".
  SKIP: single-feature dives — load `mongez-atomic-query-queries`, `mongez-atomic-query-mutations`, `mongez-atomic-query-infinite`, `mongez-atomic-query-invalidation`, `mongez-atomic-query-suspense`, `mongez-atomic-query-ssr`, or `mongez-atomic-query-cache` instead; vanilla `@mongez/atom` state without a server-data layer (use `mongez-atom-recipes`); React-Query interop — patterns translate but the API surface differs.
sidebar:
  order: 99
---

Cross-feature compositions for `@mongez/atomic-query` — the patterns that come up once you've moved past single-fetch boundaries.

## Optimistic update with rollback

You're toggling a like-count on a post. The mutation almost always succeeds, but on failure you want the UI to snap back. Read the current snapshot, apply the optimistic write, mutate, and restore on error.

```ts
function useLikePost(postId: string) {
  return useMutation({
    mutationFn: () => api.posts.like(postId),
    onMutate: () => {
      const previous = queryClient.getQueryData<Post>(["post", postId]);
      queryClient.setQueryData(["post", postId], (p?: Post) =>
        p ? { ...p, likes: p.likes + 1, likedByMe: true } : p,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["post", postId], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
  });
}
```

`onSettled` invalidates after both success and error, so the server stays the eventual source of truth.

## Paginated list + delete-an-item without refetching every page

After deleting an item, splice it out of the cached pages instead of round-tripping. The `removeFromList` helper walks the existing pages and edits in place.

```ts
const { mutate: deleteTodo } = useMutation({
  mutationFn: (id: string) => api.todos.delete(id),
  onSuccess: (_data, id) => {
    queryClient.removeFromList({
      queryKey: ["todos"],
      match: (t: Todo) => t.id === id,
    });
  },
});
```

For an insert-at-top pattern, the sibling helper is `prependToList`. See `mongez-atomic-query-list-helpers`.

## Infinite scroll with `IntersectionObserver`

A sentinel `<div>` at the end of the list triggers `fetchNextPage` when it scrolls into view — and stops firing when there are no more pages.

```tsx
function Feed() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam = 0 }) => api.feed({ cursor: pageParam }),
    getNextPageParam: last => last.nextCursor,
  });
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current || !hasNextPage) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) fetchNextPage();
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <>
      {data?.pages.flatMap(p => p.items).map(item => (
        <FeedItem key={item.id} {...item} />
      ))}
      <div ref={sentinel} />
    </>
  );
}
```

## Prefetch on link hover

By the time the user clicks the link, the destination's data is already in cache.

```tsx
function PostLink({ post }: { post: Post }) {
  const prefetch = () =>
    queryClient.prefetchQuery({
      queryKey: ["post", post.id],
      queryFn: () => api.posts.get(post.id),
      staleTime: 30_000,
    });

  return (
    <Link to={`/p/${post.id}`} onMouseEnter={prefetch} onFocus={prefetch}>
      {post.title}
    </Link>
  );
}
```

`staleTime: 30_000` keeps the prefetched data warm long enough that navigation doesn't immediately re-fetch.

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
function App({ ssrQueries }: { ssrQueries: HydrationEntry[] }) {
  return (
    <HydrateQueries entries={ssrQueries}>
      <UserPage />
    </HydrateQueries>
  );
}
```

`useQuery({ queryKey: ["user", id] })` inside `<UserPage />` returns the hydrated data synchronously. Subsequent re-fetches use the configured `staleTime`.

## Suspense-driven detail page

The component renders only when data is present — no `if (isLoading) return <Spinner />` ladder inside.

```tsx
function PostPage({ id }: { id: string }) {
  const { data: post } = useSuspenseQuery({
    queryKey: ["post", id],
    queryFn: () => api.posts.get(id),
  });
  return <h1>{post.title}</h1>;
}

function PostRoute({ id }: { id: string }) {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBoundary fallback={<NotFound />}>
        <PostPage id={id} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

Loading state lives in the Suspense boundary; error state lives in the ErrorBoundary. The leaf component reads data as if it's always there.

## Invalidate every query in a segment

After publishing a comment, every cached query whose key starts with `["posts", postId]` (the post detail, its comments list, its reactions) should refetch in one call.

```ts
queryClient.invalidateQueries({ queryKey: ["posts", postId] });
```

Segment-prefix matching is built in — passing the prefix invalidates every descendant key in one shot. To invalidate the post itself but leave its comments cached, narrow the key: `["posts", postId, "detail"]`.

## Pair with `@mongez/http` for the fetch layer

`atomic-query` doesn't dictate how you make HTTP calls. A common pairing:

```ts
import { http } from "@mongez/http";

const queries = {
  post: (id: string) => ({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await http.get<Post>(`/posts/${id}`);
      if (error) throw error;
      return data;
    },
  }),
};

// At the call site
const { data } = useQuery(queries.post(postId));
```

The `{data, error}` shape from `@mongez/http` maps cleanly: throw on error so atomic-query's `isError` / `error` slots activate; return on success so `data` populates. Centralising the query definitions (`queries.post(id)`) keeps `queryKey` and `queryFn` paired in one place.
