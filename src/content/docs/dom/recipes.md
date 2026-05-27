---
title: "Recipes"
name: mongez-dom-recipes
description: |
  Ready-to-copy cross-feature compositions for common `@mongez/dom` use cases — SPA route metadata, multi-weight font loading, dark-mode CSS-variable theming, stylesheet theme switching, smooth-scroll TOC, dialog keyboard shortcuts, consent-gated scripts, article Open Graph, viewport-driven decisions, and HTML excerpt previews.
  TRIGGER when: code combines two or more of `setPageMeta`, `loadFont`, `googleFont`, `cssVariable`, `styleSheet`, `scrollTo`, `pressed`, `loadScript`, `meta`, `metaLink`, `htmlToText`, or `userPrefersDarkMode` in one file; user asks "how do I drive page metadata from my router", "how do I load multi-weight fonts", "how do I switch themes / dark mode", "how do I build a smooth-scrolling table of contents", "how do I load analytics after consent", "how do I set article Open Graph tags", or "how do I generate an HTML excerpt"; user requests a full working example combining `@mongez/dom` features.
  SKIP: user only needs reference for a single helper — load `mongez-dom-metadata`, `mongez-dom-head-elements`, `mongez-dom-assets`, or `mongez-dom-interactions` instead; React-idiomatic declarative head management — `@mongez/react-helmet`; this package is framework-agnostic DOM.
sidebar:
  order: 99
---

Cross-feature compositions for `@mongez/dom`.

## Per-page metadata in a SPA

Drive the page's `<head>` from the router. `setPageMeta` is idempotent — call it on every route change, no special teardown needed.

```ts
import { setPageMeta } from "@mongez/dom";

function applyRouteMeta(route: { title: string; description: string; path: string }) {
  setPageMeta({
    title: route.title,
    description: route.description,
    url: `https://example.com${route.path}`,
    type: "website",
  });
}

router.on("change", applyRouteMeta);
```

In React, do the same inside a top-level effect:

```tsx
useEffect(() => applyRouteMeta(currentRoute), [currentRoute.path]);
```

## Multi-weight font loading + CSS

`googleFont` if you're OK with the network-hosted CSS; `loadFont` if you want to bundle the woff2 files and load them via `FontFace`.

```ts
import { loadFont, cssVariable } from "@mongez/dom";
import light from "./fonts/inter-300.woff2";
import regular from "./fonts/inter-400.woff2";
import bold from "./fonts/inter-700.woff2";

await loadFont({
  name: "Inter",
  weights: [
    { weight: "light",  woff2: light },
    { weight: "normal", woff2: regular },
    { weight: "bold",   woff2: bold },
  ],
});

cssVariable("--font-base", '"Inter", system-ui, sans-serif');
```

Then in CSS:

```css
:root { font-family: var(--font-base); }
.headline { font-weight: 700; }
.caption  { font-weight: 300; }
```

## Dark-mode theming via CSS variables

```ts
import { cssVariable, userPrefersDarkMode } from "@mongez/dom";

function applyTheme() {
  const dark = userPrefersDarkMode();
  cssVariable("--color-bg",   dark ? "#0a0a0a" : "#ffffff");
  cssVariable("--color-fg",   dark ? "#ededed" : "#111111");
  cssVariable("--color-link", dark ? "#7cf"     : "#06c");
}

applyTheme();

const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", applyTheme);
```

## Theme switcher with `styleSheet`

For the case where two whole stylesheets define light/dark themes, swap the href of a single `<link>`:

```ts
import { styleSheet } from "@mongez/dom";

const LIGHT = "/themes/light.css";
const DARK  = "/themes/dark.css";

styleSheet(LIGHT, "theme");

function setTheme(mode: "light" | "dark") {
  styleSheet(mode === "dark" ? DARK : LIGHT, "theme");
}
```

The `id="theme"` makes both calls hit the same `<link>` — no duplicate tags.

## Smooth-scrolling table of contents

```ts
import { scrollTo } from "@mongez/dom";

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", e => {
    e.preventDefault();
    scrollTo(anchor.getAttribute("href")!);
  });
});
```

If the URL hash should update too:

```ts
anchor.addEventListener("click", e => {
  e.preventDefault();
  const hash = anchor.getAttribute("href")!;
  scrollTo(hash);
  history.pushState(null, "", hash);
});
```

## Keyboard shortcut handler

```ts
import { pressed, ESC_KEY, ENTER_KEY } from "@mongez/dom";

function dialogShortcuts(dialog: HTMLElement, onSubmit: () => void, onCancel: () => void) {
  function onKey(e: KeyboardEvent) {
    if (pressed(e, ENTER_KEY)) { e.preventDefault(); onSubmit(); }
    else if (pressed(e, ESC_KEY)) { e.preventDefault(); onCancel(); }
  }
  dialog.addEventListener("keydown", onKey);
  return () => dialog.removeEventListener("keydown", onKey);
}
```

## Append a third-party script when consent is granted

```ts
import { loadScript } from "@mongez/dom";

let analyticsLoaded = false;

function loadAnalyticsOnce() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  loadScript("https://example.com/analytics.js", () => {
    (window as any).analytics.init("KEY");
  });
}

consentBanner.addEventListener("accept", loadAnalyticsOnce);
```

`loadScript` doesn't dedupe internally; the local flag prevents accidental double-injection.

## Compose a per-article meta head

Beyond the `setPageMeta` defaults — author, published_time, locale alternates:

```ts
import { setPageMeta, meta, metaLink } from "@mongez/dom";

function setArticleMeta(article: {
  title: string;
  description: string;
  url: string;
  image: string;
  author: string;
  publishedAt: string;
  locales: { code: string; href: string }[];
}) {
  setPageMeta({
    title: article.title,
    description: article.description,
    url: article.url,
    image: article.image,
    type: "article",
  });
  meta("article:author", article.author);
  meta("article:published_time", article.publishedAt);
  for (const l of article.locales) {
    metaLink("alternate", l.href, { hreflang: l.code });
  }
}
```

## Viewport-driven decisions

```ts
import { getScreenWidth } from "@mongez/dom";

function isMobile() {
  return getScreenWidth() < 768;
}
```

Note this reads `window.screen.width`, which is the monitor size — not the resized browser window. For the visible viewport use `window.innerWidth` directly.

## HTML excerpt for previews

```ts
import { htmlToText } from "@mongez/dom";

function excerpt(html: string, length = 160): string {
  const text = htmlToText(html).trim().replace(/\s+/g, " ");
  return text.length > length ? text.slice(0, length - 1) + "…" : text;
}
```
