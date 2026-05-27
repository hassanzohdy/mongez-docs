---
title: "Suspense mode"
name: mongez-atomic-query-suspense
description: |
  How to use useSuspenseQuery from @mongez/atomic-query to suspend a React subtree while a query loads, including ErrorBoundary pairing and behavioral gotchas.
  TRIGGER when: code imports `useSuspenseQuery` from `@mongez/atomic-query`, or uses it together with `<Suspense>` and `ErrorBoundary`; user asks "how do I use React Suspense with atomic-query / get data typed as non-undefined / pair Suspense with ErrorBoundary"; typical import `import { useSuspenseQuery } from "@mongez/atomic-query"`.
  SKIP: plain non-suspense `useQuery` usage — use `mongez-atomic-query-basic-query` or `mongez-atomic-query-queries`; SSR streaming / server-component-driven loading — use `mongez-atomic-query-ssr`; write-side mutations — use `mongez-atomic-query-mutations`; cache invalidation triggered while suspended — use `mongez-atomic-query-invalidation`.
sidebar:
  order: 50
---

`useSuspenseQuery` is a thin wrapper around `useQuery` that integrates with React Suspense:

- While the query is loading and has no data → **throws the in-flight promise**. React's runtime treats this as "suspend this tree" and renders the nearest `<Suspense fallback>`.
- When the query fails → **throws the error**. The nearest `ErrorBoundary` catches it.
- When the query resolves → returns the query object with `data` typed as the non-undefined success type.

## Signature

```ts
function useSuspenseQuery<T>(
  options: AddQueryOptions<T>,
): Query<T> & { data: T }
```

Options are the same as `useQuery`. The return type adds the guarantee that `data` is the success type (not `T | undefined`).

## Behavior

- **Render-time cache init.** Unlike `useQuery`, the cache entry is created and the fetch is kicked off **synchronously during render**. This is necessary because a component that suspends from first render never commits its `useEffect`, so the effect-based init would never run. The init is idempotent — calling it twice for the same hashKey is a no-op.
- **Stable promise identity across renders.** While the same query is pending, the hook throws the same promise reference each render so React can coalesce the suspension.
- **Subscriptions still work post-resolve.** After data lands, the hook subscribes via `useSyncExternalStore` so cache changes (refetch, invalidate, optimistic update) re-render the component normally.

## Examples

### Basic

```tsx
import { Suspense } from "react";
import { useSuspenseQuery } from "@mongez/atomic-query";

function UserList() {
  const q = useSuspenseQuery<User[]>({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      fetch("/api/users", { signal }).then(r => r.json()),
  });
  // `q.data` is `User[]`, not `User[] | undefined`.
  return <ul>{q.data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

<Suspense fallback={<Spinner />}>
  <UserList />
</Suspense>
```

### With ErrorBoundary

```tsx
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <>{this.props.fallback}</>;
    return this.props.children;
  }
}

<ErrorBoundary fallback={<p>Failed to load.</p>}>
  <Suspense fallback={<Spinner />}>
    <UserList />
  </Suspense>
</ErrorBoundary>
```

The order matters: `ErrorBoundary` must be outside `Suspense` so it catches throws from the suspended subtree.

### Multiple suspense queries — granular fallbacks

```tsx
<Suspense fallback={<HeaderSkeleton />}>
  <Header />
</Suspense>

<Suspense fallback={<FeedSkeleton />}>
  <Feed />
</Suspense>
```

Each `Suspense` boundary handles one query's loading state. The header doesn't wait for the feed.

## When to reach for this vs `useQuery`

- **Use `useQuery`** when you want explicit `isLoading` / `isError` branches in your JSX. More verbose but the control flow is local and obvious.
- **Use `useSuspenseQuery`** when you want a declarative loading boundary at the top of the subtree. Cleaner JSX, but the suspense behavior is implicit (throwing during render).
- **Use the framework loader (Next.js / Remix / TanStack)** when the data is needed for the *initial server render*. Suspense for streaming SSR lives in the framework loader, not here.

## Gotchas

- **Render-time side effects.** The hook creates the cache entry during render. This violates the usual React rule, but it's idempotent and necessary for Suspense to work. Linters that flag this may need a suppression comment.
- **No automatic ErrorBoundary.** If the query errors and you don't wrap in an `ErrorBoundary`, the error bubbles up to the React root and crashes the tree. Always pair with an `ErrorBoundary`.
- **The throw discards normal rendering.** Anything you put before the throw (other hooks, derived computations) still runs. Anything after the throw doesn't. If you have side effects to run on the data, put them in a `useEffect` after the throw — they'll fire on the post-resolve render.
- **Initialization race.** If two components mount with the same `queryKey` in the same render, both call `initSuspenseQuery`, but the second call returns early because the entry already exists. Both share the same in-flight promise — same dedup mechanism as `useQuery`.
