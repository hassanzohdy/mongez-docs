---
title: "Recipes"
name: mongez-react-helmet-recipes
description: |
  Practical copy-paste recipes for common `@mongez/react-helmet` patterns using `<Helmet>` and `setHelmetConfigurations` — static pages, async-data pages, i18n via `translationFunction`, RTL routes, per-route canonical URLs, app boot setup, layout-level vs route-level coexistence, and Next.js App Router (`"use client"`) integration.
sidebar:
  order: 99
---

Common flows across the `<Helmet>` component and its config.

## Static landing page

```tsx
import Helmet from "@mongez/react-helmet";

export default function LandingPage() {
  return (
    <>
      <Helmet
        title="Welcome"
        appendAppName={false}
        description="Beautiful homes, delivered."
        image="/og-hero.png"
        url="https://example.com/"
      />
      <Hero />
      <Features />
    </>
  );
}
```

## Detail page driven by async data

```tsx
import { useEffect, useState } from "react";
import Helmet from "@mongez/react-helmet";

export default function PostPage({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);
  useEffect(() => { api.getPost(id).then(setPost); }, [id]);

  if (!post) return <Skeleton />;

  return (
    <>
      <Helmet
        title={post.title}
        description={post.summary}
        keywords={post.tags}
        image={post.cover}
        url={`https://example.com/posts/${post.slug}`}
      />
      <PostBody post={post} />
    </>
  );
}
```

## Localized title and app name

```tsx
import { trans } from "@mongez/localization";
import Helmet, { setHelmetConfigurations } from "@mongez/react-helmet";

setHelmetConfigurations({
  appName: "appName",                 // translation key
  appendAppName: true,
  translatable: true,
  translateAppName: true,
  translationFunction: trans,
});

// Pages pass translation keys instead of literal strings.
<Helmet title="contactUs" />
// → document.title = trans("contactUs") + " | " + trans("appName")
```

## Per-page opt-out from translation

```tsx
<Helmet title="MyBrand" translatable={false} />
// Title is written verbatim — useful for proper nouns and brand names.
```

## RTL routes that switch `<html>` lang/dir

```tsx
<Helmet
  title="عربى"
  htmlAttributes={{ lang: "ar", dir: "rtl" }}
  pageId="arabic-page"
  className="arabic-route"
/>
```

The cleanup explicitly preserves `lang` and `dir` on unmount — you can switch routes between English and Arabic without the page snapping back to `lang="en" dir="ltr"`.

## Per-route canonical URLs (A/B variants point to the canonical)

```tsx
<Helmet
  title="Variant A"
  url="https://example.com/landing"   // canonical, regardless of the current path
/>
```

When `url` is a string, that string is used verbatim. When `url` is `true` (default), `window.location.href` is used.

## One-place app boot

```ts
// src/config/helmet.ts
import { trans } from "@mongez/localization";
import { setHelmetConfigurations } from "@mongez/react-helmet";

setHelmetConfigurations({
  appName: "appName",
  appendAppName: true,
  appNameSeparator: " | ",
  translatable: true,
  translateAppName: true,
  translationFunction: trans,
  htmlAttributes: { lang: "en", dir: "ltr" },
});
```

```ts
// src/main.tsx
import "./config/helmet";   // side-effect import, before any <Helmet> mounts
import App from "./App";
// ...
```

## Coexisting with a layout-level `<Helmet>`

```tsx
// Top-level layout sets safe defaults.
function Layout({ children }) {
  return (
    <>
      <Helmet title="Loading" appendAppName />
      {children}
    </>
  );
}

// A route under the layout overrides the title once data is ready.
function PostPage({ post }) {
  return (
    <>
      <Helmet title={post.title} description={post.summary} />
      <PostBody post={post} />
    </>
  );
}
```

Both `<Helmet>`s mount in tree order. The inner one's commit runs after the outer one's, so the inner values overwrite the outer values for the fields they both set. Fields only set by the outer one (e.g., default `htmlAttributes`) remain.

## Next.js App Router (client boundary)

```tsx
// app/_meta/RouteHead.tsx
"use client";
import Helmet from "@mongez/react-helmet";

export default function RouteHead(props: {
  title: string;
  description?: string;
  image?: string;
}) {
  return <Helmet {...props} />;
}
```

```tsx
// app/(marketing)/about/page.tsx
import RouteHead from "@/app/_meta/RouteHead";

export default function AboutPage() {
  return (
    <>
      <RouteHead title="About" description="Who we are." />
      <AboutBody />
    </>
  );
}
```

The `"use client"` boundary keeps the `document.documentElement` access and effects on the client where they have a body. For Next.js's native metadata API, prefer route-level `export const metadata = …`; use `<Helmet>` when you need data fetched in a client component to drive the head.
