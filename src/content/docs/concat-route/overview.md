---
title: "Concat Route"
name: mongez-concat-route-overview
description: |
  High-level orientation to `@mongez/concat-route` — what it does, how to install and import it, its mental model, and where its scope ends.
  TRIGGER when: code imports `concatRoute` from `@mongez/concat-route` for the first time in a file; user asks "what does @mongez/concat-route do", "how do I install @mongez/concat-route", "should I use concatRoute or path.posix.join", or "where does concat-route's scope end vs query-string/react-router"; `import concatRoute from "@mongez/concat-route"` appears alongside questions about purpose or scope.
  SKIP: deep behavior/edge-case questions — use `mongez-concat-route-concat-route`; idiomatic application patterns — use `mongez-concat-route-recipes`; query strings — use `mongez-query-string-*`; routing patterns — use `mongez-react-router-*`.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/concat-route` is a single-function utility for joining path segments into one normalized leading-slash path. It's the helper you reach for when you have a base path from configuration, a feature prefix from a constant, and an ID from a URL parameter, and you don't want to write `if (base.endsWith("/")) ...` six times.

The function is **path-only**: it understands `/` separators between segments, and that's it. It is not a URL builder, a query-string parser, or a router pattern matcher.

## Install

```sh
# npm
npm install @mongez/concat-route

# yarn
yarn add @mongez/concat-route

# pnpm
pnpm add @mongez/concat-route
```

Zero runtime dependencies. Browser-safe (no `node:path`).

## Quick example

Glue path segments together — leading slash guaranteed, falsy values silently dropped, embedded slashes collapsed:

```ts
import concatRoute from "@mongez/concat-route";

concatRoute("api", "/users", String(userId));      // "/api/users/42"
concatRoute("/", "/dashboard", "");                // "/dashboard"
concatRoute("/base", locale ?? "", "/products");   // "/base/products" if locale is falsy
concatRoute("/foo//", "//bar///", "baz");          // "/foo/bar/baz"
```

## Import pattern

```ts
import concatRoute from "@mongez/concat-route";
```

The default export is the entire public surface. There are no named exports, no types, no side effects.

## Mental model

| Input | Mental model |
|---|---|
| `concatRoute(a, b, c)` | "Glue `a`, `b`, `c` into a path. I don't care what trailing/leading slashes they have. I do care that the result starts with `/` and has no junk." |
| Falsy segments | Get dropped. Use this to thread optional pieces (`concatRoute(base, locale ?? "", path)`) without writing conditionals. |
| Empty input | Returns `"/"`. The function never returns an empty string. |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| Query string `?a=1&b=2` | [`@mongez/query-string`](https://github.com/hassanzohdy/mongez-query-string) | Concat-route treats `"?q=1"` as just another segment and wraps it in `/`. Use a real parser. |
| Absolute URLs with `protocol://host` | Built-in `URL` | The slash-collapse pass destroys `https://`. |
| Route pattern matching (`/users/:id`) | [`@mongez/react-router`](https://github.com/hassanzohdy/mongez-react-router) | Different problem entirely. |
| Encoding | `encodeURIComponent` | Concat-route does not encode. |

## Why a function instead of `path.posix.join`?

1. **Always leading `/`**. `path.posix.join("foo", "bar")` returns `"foo/bar"`, not `"/foo/bar"`. URL paths need the leading slash.
2. **Drops falsy segments silently**. Lets you spread optional pieces without conditionals.
3. **Browser-safe**. `node:path` isn't available in the browser without polyfilling. This function is ~10 lines, no dependencies.
4. **Collapses arbitrary slash runs**, including embedded `//` inside a single segment.
