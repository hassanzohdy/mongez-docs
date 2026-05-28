---
title: "Parse"
name: mongez-query-string-parse
description: |
  How to parse URL query strings into objects using `queryString.parse`, `queryString.all`, and `queryString.get` — including numeric coercion, `decodeURIComponent`, `key[]` arrays, and `key[sub]` nested-object syntax.
sidebar:
  order: 50
---

`queryString.parse(text)` and `queryString.all(text?)` turn a query string into an object. `parse` requires the argument; `all` defaults to `window.location.search`.

## Signatures

```ts
queryString.parse(searchParams: string): Record<string, any>
queryString.all(searchParams?: string): Record<string, any>
queryString.get(key: string, defaultValue?: any = null): any
```

## Basics

```ts
queryString.parse("foo=bar");                // { foo: "bar" }
queryString.parse("?foo=bar");               // { foo: "bar" }   — leading "?" stripped
queryString.parse("a=1&b=2");                // { a: 1, b: 2 }
queryString.parse("");                       // {}
queryString.parse("?");                      // {}

// `all` is `parse` with `window.location.search` as the default.
// On URL: /products?tag=books&page=2
queryString.all();                           // { tag: "books", page: 2 }
queryString.all("?x=1");                     // { x: 1 }   — explicit arg wins
```

## Numeric coercion

Values that look numeric come back as numbers. The check is `!isNaN(value - parseFloat(value))`:

```ts
queryString.parse("age=42");                 // { age: 42 }
queryString.parse("pi=3.14");                // { pi: 3.14 }
queryString.parse("neg=-5");                 // { neg: -5 }
queryString.parse("zero=0");                 // { zero: 0 }
queryString.parse("zip=007");                // { zip: 7 }   — leading zeros collapse
```

Strings that look numeric-ish but aren't strict numbers stay as strings:

```ts
queryString.parse("x=NaN");                  // { x: "NaN" }
queryString.parse("x=Infinity");             // { x: "Infinity" }
queryString.parse("x=true");                 // { x: "true" }    — no boolean coercion
```

If you need `"007"` to stay a string (zip codes, phone numbers, version strings), the URL is the wrong place — coerce at the consumer or use a key the parser doesn't number-coerce. There's no flag to disable coercion.

## URL decoding

Non-numeric values run through `decodeURIComponent`:

```ts
queryString.parse("greeting=hello%20world"); // { greeting: "hello world" }
queryString.parse("path=%2Fhome%2Fuser");    // { path: "/home/user" }

// `+` is NOT translated to a space — decodeURIComponent treats it literally.
queryString.parse("q=a+b");                  // { q: "a+b" }
```

If your producer encodes spaces as `+`, pre-process:

```ts
queryString.parse(text.replace(/\+/g, "%20"));
```

## Arrays — `key[]=value`

```ts
queryString.parse("tags[]=a&tags[]=b");      // { tags: ["a", "b"] }
queryString.parse("ids[]=1&ids[]=2&ids[]=3"); // { ids: [1, 2, 3] }   — each element coerced
queryString.parse("vals[]=1&vals[]=two");    // { vals: [1, "two"] }
```

A single occurrence still yields a single-element array, not a scalar:

```ts
queryString.parse("tags[]=a");               // { tags: ["a"] }
```

Without the `[]` suffix, repeated keys overwrite — last write wins:

```ts
queryString.parse("k=one&k=two");            // { k: "two" }
```

## Nested objects — `parent[child]=value`

```ts
queryString.parse("user[name]=alice&user[age]=30");
// { user: { name: "alice", age: 30 } }

queryString.parse("a[b][c]=1");
// { a: { b: { c: 1 } } }
```

Two unrelated parents in one string are fine:

```ts
queryString.parse("user[name]=alice&meta[role]=admin");
// { user: { name: "alice" }, meta: { role: "admin" } }
```

## Single-key reads via `get`

```ts
// On URL: /products?page=2&empty=
queryString.get("page");                     // 2
queryString.get("missing");                  // null   — default default
queryString.get("missing", 1);               // 1
queryString.get("missing", { x: 1 });        // { x: 1 }

// Quirk: falsy values fall through the `||` fallback.
queryString.get("empty", "fallback");        // "fallback"   (not "")
```

For a strict presence check ("did the user pass `?empty=`?"), don't use `get` — use `all()`:

```ts
"empty" in queryString.all();                // true
```

## Edge cases

| Input | Result | Note |
|---|---|---|
| `""` | `{}` | Empty short-circuits. |
| `"?"` | `{}` | Question-mark alone is empty after strip. |
| `"foo"` (no `=`) | `{ foo: "" }` | Missing `=` yields an undefined `pair[1]`, which the parser normalizes to `""`. |
| `"foo="` | `{ foo: "" }` | `isNumeric("")` is false; decode of `""` is `""`. |
| `parse(undefined)` | throws | `undefined.startsWith` throws TypeError. |

## Related skill cards

- [`serialize.md`](../serialize/) for the inverse direction.
- [`recipes.md`](../recipes/) for end-to-end flows.
