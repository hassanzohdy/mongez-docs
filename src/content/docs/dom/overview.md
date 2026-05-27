---
title: "DOM"
name: mongez-dom-overview
description: |
  High-level orientation to the `@mongez/dom` package — what it exports, the mental model for each feature area, browser-only constraints, and SSR guard patterns.
  TRIGGER when: code imports anything from `@mongez/dom` for the first time, or imports a wide slice like `setPageMeta`, `googleFont`, `cssVariable`, `scrollTo`, `pressed` together; user asks "what is @mongez/dom", "what does @mongez/dom do", "which import do I use for X", or "how do I use @mongez/dom on the server"; `import { ... } from "@mongez/dom"` appears in a fresh file with no prior context.
  SKIP: user is already deep in a specific area — load `mongez-dom-metadata`, `mongez-dom-head-elements`, `mongez-dom-assets`, or `mongez-dom-interactions` instead; React-specific declarative head management belongs to `@mongez/react-helmet`, this package is framework-agnostic DOM; persistent storage (`@mongez/cache`) and routing (`@mongez/react-router`) are separate concerns.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/dom` is the collection of imperative browser helpers that almost every front-end app ends up writing by hand. Flat function exports, no runtime dependencies, framework-agnostic. Drop it into React, Vue, Svelte, Astro, or vanilla JS — they all consume the same API.

The package targets the browser. There is no SSR layer.

## Install

```sh
# npm
npm install @mongez/dom

# yarn
yarn add @mongez/dom

# pnpm
pnpm add @mongez/dom
```

Zero runtime dependencies. Browser-only — server use throws (see Environment below).

## Quick example

A snapshot of the breadth — page metadata, fonts, CSS variables, and smooth-scroll all in one import:

```ts
import { setPageMeta, googleFont, cssVariable, scrollTo } from "@mongez/dom";

setPageMeta({
  title: "Product Page",
  description: "Buy widget X today.",
  image: "https://cdn.example.com/product.png",
  url: "https://example.com/product",
  type: "website",
});

googleFont("https://fonts.googleapis.com/css2?family=Inter", "primary-font");
cssVariable("--color-primary", "#0a84ff");
scrollTo("#section-features");
```

## Import pattern

```ts
import {
  // metadata
  setPageMeta, setTitle, setDescription, setKeywords,
  setImage, setPageColor, setFavIcon, setCanonicalUrl, getMetaData,
  // attributes
  setHTMLAttributes, setElementAttributes, getElementAttributes,
  // head builders
  createHeadElement, createNewMeta, meta, itemprop, metaLink, twitter, og,
  // assets
  styleSheet, googleFont, loadFont, loadScript,
  // css variables
  cssVariable, setCssVariable, getCssVariable,
  // viewport
  getWindowWidth, getWindowHeight, getScreenWidth, getScreenHeight,
  // keyboard
  pressed, TAB_KEY, ESC_KEY, ENTER_KEY, CONTROL_KEY,
  // misc
  scrollTo, htmlToText, userPrefersDarkMode,
  // types
  type MetaData, type AttributesList, type FontOptions, type FontWeightSetup,
} from "@mongez/dom";
```

## Environment

Every helper touches `document`, `window`, or `FontFace`. Calling on the server throws. If your module loads in both environments, guard:

```ts
function syncTitle(t: string) {
  if (typeof window !== "undefined") setTitle(t);
}
```

In React, prefer client-only effects:

```tsx
useEffect(() => setTitle(props.title), [props.title]);
```

## Mental model

| Area | What it does | Where state lives |
|---|---|---|
| Metadata | Reads/writes `<head>` tags | DOM is the source of truth. The `currentMetaData` module-level singleton is a write-through cache for change detection. |
| Head builders | Create / reuse `<meta>` and `<link>` tags | DOM. |
| Assets | Inject `<link rel=stylesheet>`, `<script>`, and `FontFace`s | DOM + `document.fonts`. |
| CSS variables | Read/write CSS custom properties on `:root` or a given element | DOM (element.style). |
| Viewport | One-line getters around `window.outerWidth`, `window.screen.width`, etc. | None — live reads. |
| Keyboard | Compare `event.keyCode \|\| event.charCode` to a constant | None — pure helper. |
| Misc | Smooth scroll, script injection, HTML-to-text, dark-mode detection | DOM / `matchMedia`. |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| React hooks / declarative metadata | `@mongez/react-helmet` | This package is framework-agnostic |
| Persistent storage (localStorage / cookies) | `@mongez/cache` | Different concern |
| Routing | `@mongez/react-router` | Different concern |

## Idioms

- **Call `setPageMeta` once per page-view.** It fans out into the seven setter helpers internally. Cheap to repeat — each setter short-circuits when the value matches the last seen value.
- **Use ids with `styleSheet` and `googleFont`** for any link you might want to replace later (theme switcher, A/B framework swap, …). Without an id you can't find the link again.
- **No event subscriptions.** Helpers here are fire-and-forget. If you need to react to attribute changes, use a `MutationObserver` directly.
