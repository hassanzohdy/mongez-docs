---
title: "Query String"
name: mongez-query-string-overview
description: |
  Package orientation for `@mongez/query-string` — what it does, how to import it, its mental model, environment constraints, and scope boundaries vs. sibling packages.
  TRIGGER when: code imports the default-export `queryString` and calls `parse`, `toQueryString`, `all`, `get`, `toString`, or `update` from `@mongez/query-string`; user asks "what does @mongez/query-string do", "which @mongez package handles query strings", or "can I use this on the server"; `import queryString from "@mongez/query-string"`.
  SKIP: deep-dive parse semantics (numeric coercion, `[]` arrays, `[sub]` nesting) — use `mongez-query-string-parse`; deep-dive serialize semantics, `update`, `null` quirks — use `mongez-query-string-serialize`; full filter/pagination/round-trip patterns — use `mongez-query-string-recipes`; URL/path joining (`@mongez/concat-route`); React-aware URL hooks (`@mongez/react-router`); native `URLSearchParams`.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/query-string` is the parse/serialize half of every URL-driven feature — filters, sorts, pagination, search forms — packaged as one default-export object. Pass it an object, get back a query string with `[]` array brackets and `[parent][child]` nesting. Pass it a query string, get back an object with numeric coercion applied.

Four browser-bound methods (`all`, `get`, `update`, `toString`) read and write `window.location`. The two pure data methods (`parse`, `toQueryString`) work anywhere.

No runtime dependencies.

## Install

```sh
yarn add @mongez/query-string
```

## Import pattern

```ts
import queryString from "@mongez/query-string";

queryString.parse(text);
queryString.toQueryString(obj);

// browser-only:
queryString.all();
queryString.get(key, fallback);
queryString.toString();
queryString.update(params);
```

There are no named exports for the public API. The internal `toObjectParser` / `toStringParser` are reachable for callers that want to bypass the facade, but they're implementation details.

## Mental model

| Concept | Type | Mental model |
|---|---|---|
| `parse` / `toQueryString` | pure function | Stateless conversion between `Record<string, any>` and `string`. Same in browser and server. |
| `all` / `get` / `toString` | browser read | Sugar over `parse(window.location.search)`. |
| `update` | browser write | Sugar over `history.replaceState(pathname + "?" + toQueryString(params))`. |
| Numeric coercion | parse-time | Values matching `!isNaN(v - parseFloat(v))` become numbers. Lossy by design: `"007"` → `7`. |
| Array shape | URL convention | `key[]=a&key[]=b` ⇄ `{ key: ["a", "b"] }`. |
| Object shape | URL convention | `parent[child]=v` ⇄ `{ parent: { child: v } }`. Any depth. |

## Environment

- **Browser**: every method works.
- **Server / Worker**: `parse` and `toQueryString` are safe. `all` / `get` / `toString` / `update` reference `window.location` / `window.history` and will throw. Guard with `typeof window !== "undefined"` if the same module loads on both sides, or call from a client-only effect.

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| URL / path joining, normalization | `@mongez/concat-route` | Different concern from query-string |
| React-aware URL state hooks | `@mongez/react-router` | This package is framework-agnostic |
| Cookies / localStorage / sessionStorage | `@mongez/cache` | Different storage |
| Form state | `@mongez/react-form` | Different concern |

## Idioms

- **Call `update` from event handlers, not effects.** It's a deliberate side effect on browser history; running it in a `useEffect` makes the URL flip on every render. If you must, debounce or compare against `queryString.toString()` first.
- **Don't trust `get(key, default)` for falsy values.** `all[key] || default` falls through for `0`, `""`, `false`. Use `key in queryString.all()` if you need a presence check.
- **Pass raw strings to the serializer** — `toQueryString` runs values through `encodeURIComponent` for you. Pre-encoding at the call site double-encodes.
- **Use `update({})` to clear the query string.** It rewrites the URL to just the pathname.
- **`update` does not fire `popstate`.** If you mirror URL state into another store, subscribe to your store, not `popstate`.
