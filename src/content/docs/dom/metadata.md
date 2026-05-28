---
title: "Metadata"
name: mongez-dom-metadata
description: |
  API reference for managing page metadata — title, description, Open Graph, Twitter Card, canonical URL, favicon, and theme color — via `setPageMeta` and its per-field helpers.
sidebar:
  order: 50
---

The high-level API for managing `<head>` tags. One call sets the title, social meta, canonical URL, favicon, theme color, and Open Graph type.

## Signature

```ts
setPageMeta(metaList: MetaData): void

type MetaData = {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string | string[];
  url?: string;        // canonical
  favIcon?: string;
  color?: string;      // theme color
  type?: "website" | "article" | "profile" | "book" | "music" | "video" | string;
};
```

Pass any subset of fields. Each delegates to a single-purpose helper that's also independently exported.

## What each field emits

| Field | Tags written |
|---|---|
| `title` | `<title>`, `meta[property=og:title]`, `meta[property=og:image:alt]`, `meta[property=twitter:title]`, `meta[property=twitter:image:alt]`, `meta[itemprop=name]` |
| `description` | `meta[name=description]`, `meta[itemprop=description]`, `meta[property=og:description]`, `meta[property=twitter:description]` |
| `keywords` | `meta[name=keywords]` (arrays are joined with `,`) |
| `image` | `meta[property=image]`, `meta[property=og:image]`, `meta[property=twitter:image]`, `meta[itemprop=image]` |
| `url` | `link[rel=canonical]`, `meta[property=og:url]`, `meta[property=twitter:url]` |
| `favIcon` | `link[rel=icon]` |
| `color` | `meta[name=theme-color]` |
| `type` | `meta[property=og:type]` |

## Per-field helpers

These are also exported and can be called individually. Each is idempotent — repeat calls update the existing tag instead of creating duplicates.

```ts
setTitle(title: string): string | void
setDescription(description: string): string
setKeywords(keywords: string | string[]): HTMLMetaElement | undefined
setImage(imagePath: string): void
setPageColor(color: string): HTMLMetaElement | undefined
setFavIcon(favIcon: string): HTMLLinkElement | undefined
setCanonicalUrl(url: string): void
```

```ts
import { setTitle, setDescription, setImage } from "@mongez/dom";

setTitle("Product page");        // updates <title> + 5 related social tags
setDescription("Buy widget X");  // updates 4 description tags
setImage("https://example.com/cover.png");
```

## Reading what's been set

```ts
getMetaData(): MetaData
getMetaData(key: keyof MetaData): MetaData[K]
```

Returns the internal `currentMetaData` singleton — the values most recently passed to the setters. Reflects setter calls only; if your code wrote to the DOM directly via `document.head.querySelector(...).setAttribute(...)`, `getMetaData` won't see it.

```ts
import { setTitle, getMetaData } from "@mongez/dom";

setTitle("Hello");
getMetaData("title");  // "Hello"
getMetaData();         // { title: "Hello", description: "", image: "", ... }
```

## Examples

### Set the whole head in one call

```ts
setPageMeta({
  title: "Hello World",
  description: "An example page.",
  keywords: ["hello", "world", "demo"],
  image: "https://cdn.example.com/cover.png",
  url: "https://example.com/p/hello",
  favIcon: "/favicon.ico",
  color: "#0a0a0a",
  type: "article",
});
```

### Update one field per route in a SPA

```ts
import { setPageMeta } from "@mongez/dom";

function onRouteChange(route: Route) {
  setPageMeta({
    title: route.title,
    description: route.description,
    url: `https://example.com${route.path}`,
  });
}
```

### Per-component pattern with React effects

```tsx
import { useEffect } from "react";
import { setTitle, setDescription } from "@mongez/dom";

function ProductPage({ product }: { product: Product }) {
  useEffect(() => {
    setTitle(product.name);
    setDescription(product.description);
  }, [product.name, product.description]);
  // ...
}
```

If you need the React-idiomatic, declarative version of this, see `@mongez/react-helmet`.

## Gotchas

- **`setTitle("X")` called twice does not emit duplicate tags** — the second call short-circuits when the title matches the last cached value.
- **Arrays of keywords are joined with a literal `,`** — no spaces. If you want `"foo, bar, baz"`, pre-join with `", "` yourself: `setKeywords(keys.join(", "))`.
- **`setImage` is for social images.** `meta[property="image"]` is unusual — most consumers only look at `og:image` and `twitter:image`. The duplicate `image` tag is harmless but undocumented.
- **`setPageColor` emits `<meta name="theme-color">`** — the HTML-spec form user agents honor. `meta()` special-cases `"theme-color"` (alongside `"keywords"` and `"description"`) so the attribute is `name=`, not `property=`.
