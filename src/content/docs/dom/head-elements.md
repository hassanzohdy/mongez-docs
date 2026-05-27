---
title: "Head elements"
name: mongez-dom-head-elements
description: |
  Lower-level helpers for creating and reusing `<meta>` and `<link>` tags in `<head>`, plus reading/writing HTML element attributes on `<html>` or any element.
  TRIGGER when: code imports `createHeadElement`, `createNewMeta`, `meta`, `itemprop`, `metaLink`, `twitter`, `og`, `setHTMLAttributes`, `setElementAttributes`, `getElementAttributes`, or the `AttributesList` type from `@mongez/dom`; user asks "how do I add custom og:* / article:* meta tags", "how do I add a manifest link", "how do I set html[lang] / html[dir]", "how do I add a preconnect / alternate link", or "how do I read all attributes off an element"; `import { meta, metaLink, itemprop, setHTMLAttributes } from "@mongez/dom"`.
  SKIP: user only needs the common `title` / `description` / `og:*` / `twitter:*` / favicon / canonical fields — load `mongez-dom-metadata` instead; `<link rel="stylesheet">` / Google Fonts injection lives in `mongez-dom-assets`; React declarative head — `@mongez/react-helmet`; this package is framework-agnostic DOM.
sidebar:
  order: 50
---

Lower-level helpers under the metadata API. Use these when the high-level `setPageMeta` doesn't fit — custom `og:*` tags, manifest links, app-specific meta names, or element-attribute writes on something other than `<head>`.

## Builders

```ts
createHeadElement(tagName: string, props: object): HTMLElement
createNewMeta(props: object): HTMLMetaElement       // = createHeadElement("meta", props)
```

Creates a tag, copies every key from `props` via `setAttribute`, appends to `<head>`, returns the element.

```ts
import { createHeadElement, createNewMeta } from "@mongez/dom";

createHeadElement("link", { rel: "manifest", href: "/manifest.webmanifest" });
createHeadElement("link", { rel: "preconnect", href: "https://cdn.example.com" });
createNewMeta({ name: "viewport", content: "width=device-width, initial-scale=1" });
```

These never look up an existing element. Successive calls duplicate. If you need idempotent behavior, use `meta()`, `metaLink()`, or `styleSheet()` below.

## `meta(name, value)` — idempotent meta tag

```ts
meta(metaName: string, value: string): HTMLMetaElement
```

Selector rule: `meta[name="${n}"]` when `n` is `"keywords"`, `"description"`, or `"theme-color"`, otherwise `meta[property="${n}"]`. Reuses an existing tag if found, otherwise creates one. The content is trimmed.

```ts
import { meta } from "@mongez/dom";

meta("og:type", "article");                    // <meta property="og:type" content="article">
meta("description", "An example page");        // <meta name="description" content="An example page">
meta("og:type", "website");                    // updates the existing tag
```

## `itemprop(name, value)` — idempotent itemprop meta tag

```ts
itemprop(name: string, value: string): void
```

Selector: `meta[itemprop="${name}"]`. Same reuse-or-create behavior as `meta()`.

```ts
itemprop("name", "Hello World");
itemprop("description", "A page");
```

## `metaLink(rel, href, otherAttributes?)` — idempotent link tag

```ts
metaLink(rel: string, href: string, otherAttributes?: object): HTMLLinkElement
```

Selector: `link[rel="${rel}"]`. Reuses if found, otherwise creates. Always sets `href`. Patches any `otherAttributes` after via `setAttribute`.

```ts
import { metaLink } from "@mongez/dom";

metaLink("manifest", "/manifest.webmanifest");
metaLink("alternate", "https://example.com/feed.xml", { type: "application/rss+xml" });
metaLink("canonical", "https://example.com/p");   // ←  what setCanonicalUrl uses internally
```

## `twitter(type?)` and `og(...)`

```ts
twitter(type: string = "summary"): HTMLMetaElement   // <meta property="twitter:card" content="...">
og(opts: OpenGraph): void                            // currently a no-op
```

`twitter()` writes `meta[property=twitter:card]`. `og()` is exported in the surface but its body is empty — placeholder for future Open Graph helpers. Do not rely on it.

## Element attributes

```ts
setElementAttributes(element: HTMLElement, attributes: AttributesList): void
setHTMLAttributes(attributes: AttributesList): void
getElementAttributes(element: HTMLElement): AttributesList

type AttributesList = { [attributeKey: string]: any };
```

`setHTMLAttributes(...)` is `setElementAttributes(document.documentElement, ...)`. Use it for `<html lang>`, `<html dir>`, custom `data-*` attributes on the root element, etc.

```ts
import { setHTMLAttributes, setElementAttributes, getElementAttributes } from "@mongez/dom";

setHTMLAttributes({ lang: "en", dir: "ltr", "data-theme": "dark" });

const button = document.getElementById("submit")!;
setElementAttributes(button, {
  type: "submit",
  "aria-busy": "true",
  disabled: "",
});

getElementAttributes(button);
// { type: "submit", "aria-busy": "true", disabled: "", id: "submit" }
```

`getElementAttributes` walks the live `element.attributes` collection and returns a plain object. `disabled=""` is preserved as the empty string — attribute presence is not collapsed to a boolean.

## Composition example — custom OG sub-tree

The high-level `setPageMeta` covers the common social fields but not the long tail (article author, article published_time, locale alternates, …). Compose your own helper from `meta` and `metaLink`:

```ts
import { meta, metaLink } from "@mongez/dom";

function setArticleMeta(article: { author: string; publishedAt: string; locales: string[] }) {
  meta("og:type", "article");
  meta("article:author", article.author);
  meta("article:published_time", article.publishedAt);
  for (const locale of article.locales) {
    metaLink("alternate", `?lang=${locale}`, { hreflang: locale });
  }
}
```

Repeat calls update existing tags via the same selector rules — no duplicates.
