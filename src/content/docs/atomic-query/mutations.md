---
title: "Mutations (useMutation)"
name: mongez-atomic-query-mutations
description: |
  How to use useMutation for write-side operations, including optimistic updates with onMutate/onError rollback and direct cache writes with updateQueryData.
sidebar:
  order: 30
---

## How to use

### Basic mutation

```tsx
"use client";
import { useMutation, queryAtom } from "@mongez/atomic-query";

function CreateUserForm() {
  const createUser = useMutation<User, { name: string }>({
    mutationFn: async ({ name }, { signal }) =>
      fetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ name }),
        signal,
      }).then(r => r.json()),

    onSuccess: (created) => {
      // Append the new record to the list cache
      queryAtom.updateQueryData<User[]>(["users"], old =>
        [...(old ?? []), created]
      );
    },

    onSettled: () => {
      // Refresh any derived queries regardless of outcome
      queryAtom.invalidate({ queryKey: ["users", "stats"] });
    },
  });

  return (
    <button
      disabled={createUser.isPending}
      onClick={() => createUser.mutate({ name: "Alice" })}
    >
      {createUser.isPending ? "Creating…" : "Create user"}
    </button>
  );
}
```

### Full options

```ts
useMutation<TData, TVariables, TContext>({
  mutationFn: (variables: TVariables, ctx: { signal: AbortSignal }) =>
    Promise<TData>;

  // Runs BEFORE the mutation fires. Return value becomes `context` in onError.
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;

  // Called on success.
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) =>
    void | Promise<void>;

  // Called on failure. Use `context` to roll back optimistic state.
  onError?: (error: unknown, variables: TVariables, context: TContext | undefined) =>
    void | Promise<void>;

  // Called after success or error (always fires).
  onSettled?: (
    data: TData | undefined,
    error: unknown,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
})
```

### Return shape

| Field | Type | Meaning |
|---|---|---|
| `mutate` | `(variables) => Promise<TData>` | Fire the mutation; returns a promise. |
| `mutateAsync` | `(variables) => Promise<TData>` | Alias for `mutate`. |
| `reset` | `() => void` | Clear state and abort any in-flight call. |
| `status` | `"idle" \| "pending" \| "error" \| "success"` | Current lifecycle state. |
| `isPending` | `boolean` | Mutation is in flight. |
| `isError` | `boolean` | Last call failed. |
| `isSuccess` | `boolean` | Last call succeeded. |
| `isIdle` | `boolean` | Never fired, or after `reset()`. |
| `data` | `TData \| undefined` | Result of the last successful call. |
| `error` | `unknown` | Error from the last failed call. |
| `variables` | `TVariables \| undefined` | Variables passed to the last call. |

### Optimistic update with rollback

```tsx
const updateUser = useMutation<User, { id: number; name: string }, { previous: User[] | undefined }>({
  // 1. Snapshot the cache and apply the optimistic change before the request fires.
  onMutate: async ({ id, name }) => {
    const previous = queryAtom.getData(["users"]) as User[] | undefined;

    queryAtom.updateQueryData<User[]>(["users"], old =>
      (old ?? []).map(u => u.id === id ? { ...u, name } : u)
    );

    return { previous }; // This becomes `context` in onError
  },

  mutationFn: async ({ id, name }, { signal }) =>
    fetch(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
      signal,
    }).then(r => r.json()),

  // 2. On error, restore the snapshot.
  onError: (_err, _vars, context) => {
    if (context?.previous !== undefined) {
      queryAtom.updateQueryData(["users"], () => context.previous!);
    }
  },

  // 3. On success, replace the optimistic stub with the server's canonical record.
  onSuccess: (serverUser) => {
    queryAtom.updateQueryData<User[]>(["users"], old =>
      (old ?? []).map(u => u.id === serverUser.id ? serverUser : u)
    );
  },
});
```

### Direct cache write without a mutation hook

When you only need to update the cache without a side effect:

```ts
// Append
queryAtom.updateQueryData<User[]>(["users"], old => [...(old ?? []), newUser]);

// Remove by id
queryAtom.updateQueryData<User[]>(["users"], old =>
  (old ?? []).filter(u => u.id !== deletedId)
);

// Replace one record
queryAtom.updateQueryData<User[]>(["users"], old =>
  (old ?? []).map(u => u.id === updated.id ? updated : u)
);
```

Standalone export:
```ts
import { updateQueryData } from "@mongez/atomic-query";
```

## Key details / Pitfalls

- **Mutations do NOT write to the `queryAtom` cache themselves.** The hook tracks its own local `status`/`data`/`error`. Cache interaction is always explicit: you call `queryAtom.updateQueryData`, `queryAtom.push`, `queryAtom.invalidate`, etc. inside the callbacks.

- **A second `mutate` call automatically aborts the previous in-flight one.** There is no built-in debounce; if you need it, add your own. The `reset()` method also aborts the current in-flight call.

- **Unmounting aborts the in-flight mutation.** The `onSuccess`/`onError`/`onSettled` callbacks are NOT called when the signal is aborted (the hook checks `controller.signal.aborted` before invoking them).

- **`onMutate` runs before `mutationFn`**, even before the network request starts. If `onMutate` throws, `mutationFn` is never called and `onError` fires with the `onMutate` error.

- **`updateQueryData` is a no-op when the query does not exist yet.** If you call it for a key that has never been loaded, it silently does nothing. Pre-populate with `seedQuery` if you need it to work before the first `useQuery` mount.

- **`mutate` vs `mutateAsync`**: They are the same function. Both return a promise and throw on failure. The distinction from TanStack Query (where `mutate` swallowed errors) does not apply here — always wrap in try/catch or `.catch()` when using the return value.
