---
title: "Usage"
name: mongez-concat-route-concat-route
description: |
  Complete function reference for `concatRoute` — signature, normalization pipeline, return contract, full behavior table, edge cases, and what to avoid.
sidebar:
  order: 50
---

The single export. A variadic path joiner.

## Signature

```ts
function concatRoute(...segments: string[]): string;
```

```ts
import concatRoute from "@mongez/concat-route";
```

## Normalization (in execution order)

1. **Filter falsy.** Each segment passes `value && String(value).length > 0`. Removes `""`, `null`, `undefined`, `0`, and `false`.
2. **Strip outer slash per segment.** `String(s).replace(/^\/|\/$/g, "")`. Despite `/g`, the `^` and `$` anchors limit it to one strip per side, so `"///foo///"` becomes `"//foo//"`.
3. **Prefix each surviving segment with `/`, join with no separator.** `["foo", "bar"]` → `"/foo/bar"`.
4. **Collapse runs of `/`.** `.replace(/(\/)+/g, "/")` flattens any embedded doubles left over from step 2.
5. **Strip the now-outer slashes once more, prepend `/`.** Final guarantee: starts with exactly one `/`, never ends with `/`.

## Return contract

- Always returns a `string`.
- Result is always non-empty.
- Result always starts with `/`.
- Result never ends with `/` **except** when it IS `"/"` (the root, when there's nothing else to return).

## Behavior table

| Call | Result | Note |
|---|---|---|
| `concatRoute()` | `"/"` | Empty input → root |
| `concatRoute("")` | `"/"` | Empty string filtered |
| `concatRoute("/")` | `"/"` | Slash-only collapses to root |
| `concatRoute("/", "/")` | `"/"` | Same |
| `concatRoute("foo")` | `"/foo"` | Leading slash added |
| `concatRoute("/foo/")` | `"/foo"` | Outer slashes stripped |
| `concatRoute("foo", "bar")` | `"/foo/bar"` | Joined with `/` |
| `concatRoute("/", "home")` | `"/home"` | Slash segment collapses |
| `concatRoute("///foo///", "bar")` | `"/foo/bar"` | Multi-slash collapsed |
| `concatRoute("a/b", "c")` | `"/a/b/c"` | Embedded `/` preserved |
| `concatRoute("a//b", "c")` | `"/a/b/c"` | Embedded `//` collapsed |
| `concatRoute("/", "home", "", null, undefined, "/")` | `"/home"` | Mixed falsy filtered |
| `concatRoute("/home", "?q=1")` | `"/home/?q=1"` | Query as segment → leading `/` |
| `concatRoute("/home", "#x")` | `"/home/#x"` | Hash as segment → leading `/` |
| `concatRoute("https://x.com", "/api")` | `"/https:/x.com/api"` | Protocol `//` is destroyed — DON'T pass absolute URLs |

## Quick examples

```ts
concatRoute("/api", "v1", "users", String(userId));
// "/api/v1/users/42"

concatRoute("/", locale ?? "", "products", slug);
// locale = "en"  →  "/en/products/foo"
// locale = ""    →  "/products/foo"
// locale = null  →  "/products/foo"

concatRoute(base, ...crumbs);
// base = "/app/", crumbs = ["users", "42", "edit"]
// → "/app/users/42/edit"
```

## What to avoid

- **Do NOT pass query strings or hash fragments as segments.** They get wrapped in `/`. Build the path first, append the rest:
  ```ts
  const path = concatRoute("/search");
  const url  = `${path}?q=${encodeURIComponent(q)}`;
  ```
- **Do NOT pass absolute URLs.** The slash-collapse pass turns `https://` into `https:/`. Use the platform `URL`:
  ```ts
  const url = new URL(concatRoute("/api", "v1", "users"), "https://example.com");
  ```
- **Do NOT pre-encode and re-pass.** Concat-route doesn't decode, but if you encoded `/` as `%2F` in a value, it stays `%2F`. That's usually what you want; just be aware.

## Trivia

- The function does NOT collapse `.` or `..` segments — `concatRoute(".", "..")` returns `"/./.."`.
- It does NOT trim whitespace — `concatRoute(" ")` returns `"/ "`.
- It does NOT case-fold or lowercase — `concatRoute("/Users")` returns `"/Users"`.
