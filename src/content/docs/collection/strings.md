---
title: "Strings"
name: mongez-collection-strings
description: |
  Per-element string transforms on an `ImmutableCollection` — `appendString`, `prependString`, `concatString`, `replaceString`, `replaceAllString`, `removeString`, `removeAllString`, `trim` — plus type casting (`string`, `number`, `boolean`). Documents the keyed-form source mutation, the `replaceAllString` "always global regex" trap, and when to reach for `.map` instead.
sidebar:
  order: 50
---

Two flavors of every transform:

```ts
c.transform(value)              // applied to each item (as a string)
c.transform(value, key)         // applied to each item's keyed value
```

All return a new collection. The keyed form shallow-clones each plain-object item via `cloneForSet` before applying the change, so the source items are not modified. (Class instances and nested object references are passed through; the clone is shallow.)

## Append / prepend / concat

```ts
c.appendString(s, key?)         // item + s
c.prependString(s, key?)        // s + item
c.concatString(s, key?)         // identical to appendString for strings
```

```ts
collect(["Ada", "Bob"]).appendString("!");
//  ["Ada!", "Bob!"]

collect([{ name: "Ada" }]).appendString("!", "name");
//  [{ name: "Ada!" }]
```

## Replace / remove

```ts
c.replaceString(search: string | RegExp, replacement: string, key?)
c.replaceAllString(search: string, replacement: string, key?)   // search is a string; promoted to `new RegExp(search, "g")`
c.removeString(search: string | RegExp, key?)                    // replace with ""
c.removeAllString(search: string, key?)                          // replace all with ""
```

```ts
collect(["aba", "aaa"]).replaceString("a", "x");
//  ["xba", "xaa"]

collect(["aba", "aaa"]).replaceAllString("a", "x");
//  ["xbx", "xxx"]

collect(["aaba"]).removeAllString("a");
//  ["b"]
```

> `replaceAllString` ALWAYS does a global regex replace (the first arg is forced into `new RegExp(s, "g")`). If you pass a regex, that's wrong — use `replaceString(/regex/g, ...)` instead.

## Trim

```ts
c.trim(value?: string = " ", key?: string)
```

```ts
collect(["  hi  ", " x "]).trim();           // ["hi", "x"]
collect(["##a##", "#b#"]).trim("#");         // ["a", "b"]
```

Wraps reinforcements' `trim(string, chars)`, which strips repeated occurrences of `chars` from both ends.

## Casting

```ts
c.string()         // each item via String(item)
c.number()         // each item via Number(item)
c.boolean()        // each item via Boolean(item)
```

```ts
collect([1, null, "x"]).string();       // ["1", "null", "x"]
collect(["1", "abc", ""]).number();     // [1, NaN, 0]
collect([0, 1, "", "x"]).boolean();     // [false, true, false, true]
```
