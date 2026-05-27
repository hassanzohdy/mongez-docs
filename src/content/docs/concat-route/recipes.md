---
title: "Recipes"
name: mongez-concat-route-recipes
description: |
  Idiomatic patterns for `concatRoute` covering API URL construction, locale-prefixed routes, base-path normalization, query string composition, paginated routes, sub-resources, breadcrumb arrays, and building absolute URLs.
  TRIGGER when: code imports `concatRoute` from `@mongez/concat-route` in a real application flow; user asks "how do I build an API URL with concatRoute", "how do I add an optional locale prefix to my routes", "how do I normalize a configurable base path", "how do I append a query string to a concatRoute result", or "how do I spread a breadcrumb array into concatRoute"; `import concatRoute from "@mongez/concat-route"` appears next to helpers like `userUrl(id)` or `route(locale, ...rest)`.
  SKIP: signature/normalization-rules deep dives — use `mongez-concat-route-concat-route`; first-time package orientation/install — use `mongez-concat-route-overview`; building query strings — use `mongez-query-string-*`; route pattern matching — use `mongez-react-router-*`.
sidebar:
  order: 99
---

Idiomatic uses of `concatRoute`.

## Build an API URL from a base path

```ts
import concatRoute from "@mongez/concat-route";

const API_BASE = "/api/v1";

function userUrl(id: string | number) {
  return concatRoute(API_BASE, "users", String(id));
}

userUrl(42);      // "/api/v1/users/42"
userUrl("me");    // "/api/v1/users/me"
```

## Locale-prefixed routes

The falsy-filter lets you keep one code path for "with locale" and "no locale":

```ts
function route(locale: string | undefined, ...rest: string[]) {
  return concatRoute("/", locale ?? "", ...rest);
}

route("en", "products");        // "/en/products"
route(undefined, "products");   // "/products"
route("",  "products");         // "/products"
```

## Normalize a user-configured base path

Config files often have base paths like `"/app/"`, `"app"`, `"/app"`, or `""`. Funnel them all through `concatRoute` for a single canonical form:

```ts
function normalizeBase(base: string | undefined): string {
  return concatRoute(base ?? "");
}

normalizeBase("/app/");   // "/app"
normalizeBase("app");     // "/app"
normalizeBase("/app");    // "/app"
normalizeBase("");        // "/"
normalizeBase(undefined); // "/"
```

## Compose a path with a query string

Concat-route is path-only. Append the query string yourself with `URLSearchParams` or `@mongez/query-string`:

```ts
const path  = concatRoute("/search");
const query = new URLSearchParams({ q: "atoms", page: "2" }).toString();
const url   = `${path}?${query}`;
// "/search?q=atoms&page=2"
```

## Paginated routes

```ts
function listUrl(resource: string, page: number = 1) {
  const path = concatRoute("/api", "v1", resource);
  return page > 1 ? `${path}?page=${page}` : path;
}

listUrl("users");     // "/api/v1/users"
listUrl("users", 3);  // "/api/v1/users?page=3"
```

## Sub-resources

```ts
function postCommentsUrl(postId: string | number) {
  return concatRoute("/api", "v1", "posts", String(postId), "comments");
}

postCommentsUrl(7);   // "/api/v1/posts/7/comments"
```

## Spread a breadcrumb array

```ts
const crumbs = ["dashboard", "settings", "billing"];
concatRoute(...crumbs);
// "/dashboard/settings/billing"
```

## Build an absolute URL (use `URL`, not `concatRoute`)

`concatRoute` will mangle the protocol's `//`. Compose the path with `concatRoute`, then hand it to the platform `URL`:

```ts
const path = concatRoute("/api", "v1", "users");
const url  = new URL(path, "https://example.com").toString();
// "https://example.com/api/v1/users"
```
