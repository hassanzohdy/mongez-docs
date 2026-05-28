---
title: "List helpers"
name: mongez-atomic-query-list-helpers
description: |
  Array mutation helpers on queryAtom (push, unshift, pop, shift, replace, remove, removeByIndex, clear, sort, reverse) that update a cached array value in-place without triggering a refetch.
sidebar:
  order: 70
---

When your cached value is an array, mutate it directly through the cache. Each helper is immutable under the hood (creates a new array, swaps it in via `updateQueryData`), but the API reads like Array.prototype.

## Methods

```ts
queryAtom.push(queryKey, data): void                       // append
queryAtom.unshift(queryKey, data): void                    // prepend
queryAtom.pop(queryKey): void                              // drop last
queryAtom.shift(queryKey): void                            // drop first
queryAtom.replace(queryKey, index, data): void             // overwrite at index
queryAtom.removeByIndex(queryKey, index): void             // splice out at index
queryAtom.remove(queryKey, item): void                     // strict-equality filter
queryAtom.clear(queryKey): void                            // []
queryAtom.sort(queryKey, (a, b) => number): void           // stable sort, new array
queryAtom.reverse(queryKey): void                          // reverse, new array
```

Each is also exported as a top-level function:

```ts
import { push, unshift, pop, remove, sort } from "@mongez/atomic-query";
push(["users"], newUser);
```

## Examples

### Add to a list after a mutation

```tsx
const createUser = useMutation({
  mutationFn: api.users.create,
  onSuccess: created => queryAtom.push(["users"], created),
});
```

### Remove from a list

```ts
const userToRemove = users.find(u => u.id === id)!;
queryAtom.remove(["users"], userToRemove);

// Or by index:
queryAtom.removeByIndex(["users"], indexOfUser);
```

### Replace an item

```ts
queryAtom.replace(["users"], idx, updatedUser);
```

### Reorder

```ts
queryAtom.sort(["todos"], (a, b) => a.priority - b.priority);
queryAtom.reverse(["todos"]);
```

## Gotchas

- **`remove(item)` uses strict equality.** For object items, you usually want `removeByIndex(queryKey, findIndex(...))`.
- **No-ops on `undefined`.** If the query hasn't loaded yet (`data === undefined`), the helpers treat the value as `[]` rather than throwing. This lets you fire optimistic mutations without first checking that the query has resolved.
- **They flow through `updateQueryData`.** Subscribers re-render once per call; no refetch fires.
