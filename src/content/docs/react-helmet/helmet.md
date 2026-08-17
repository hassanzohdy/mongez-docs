---
title: "The <Helmet> component"
name: mongez-react-helmet-helmet
description: |
  Complete reference for the `<Helmet>` component — its props, `HelmetProps` TypeScript type, per-effect lifecycle, usage examples, and cleanup semantics.
sidebar:
  order: 50
---

## Import

```ts
import Helmet from "@mongez/react-helmet";
```

## Props

```ts
type HelmetProps = {
  title: string;                        // required

  // App-name suffix; falls back to config when undefined.
  appName?: string;
  appendAppName?: boolean;              // default: true
  appNameSeparator?: string;            // default: " | "

  // i18n
  translatable?: boolean;               // default: true

  // Page meta
  description?: string;
  keywords?: string | string[];
  image?: string;
  url?: boolean | string;               // string → that URL; true → window.location.href; default: true

  // <html> tag controls
  htmlAttributes?: Record<string, any>;
  pageId?: string;
  className?: string;
};
```

Only `title` is required. Every other prop either falls back to the value in `setHelmetConfigurations` (when one of `appName`, `appendAppName`, `appNameSeparator`, `url`, `translatable`, `htmlAttributes`, `className`) or simply isn't touched (`description`, `keywords`, `image`, `pageId`).

## Lifecycle

```
mount
 ├── snapshot <html> attributes / id / className and current @mongez/dom metadata
 ├── title effect           — depends on [title, appName, appNameSeparator, appendAppName]
 ├── pageId effect          — depends on [pageId]
 ├── className effect       — depends on [className]
 ├── htmlAttributes effect  — depends on [htmlAttributes]
 ├── description effect     — depends on [description]
 ├── keywords effect        — depends on [keywords]
 ├── image effect           — depends on [image]
 └── url effect             — depends on [url]

re-render (one of those deps changed)
 └── the corresponding effect re-runs with the new value

unmount
 └── each effect's cleanup tries to restore the snapshot for its concern
```

The component returns `null`. Place it at any depth in a tree — including inside a Suspense boundary, route shell, or a conditional render branch.

## Examples

### Static page

```tsx
<Helmet
  title="Welcome"
  appendAppName={false}
  description="Beautiful homes, delivered."
  image="/og-hero.png"
  url="https://example.com/"
/>
```

### Async-data page

```tsx
function PostPage({ id }: { id: string }) {
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

When `post` flips from `null` to a real object the whole subtree re-mounts past the early return; the `<Helmet>` then mounts with the populated values.

### Per-page `<html>` attributes

```tsx
<Helmet
  title="عربى"
  htmlAttributes={{ lang: "ar", dir: "rtl" }}
  pageId="arabic-page"
  className="arabic-route"
/>
```

## Cleanup semantics

On unmount each effect restores the value that was present at mount time. The pre-mount snapshot is a shallow clone of `@mongez/dom`'s `getMetaData()` result (taken inside `useMemo` at line 37 of `Helmet.tsx`), so `title` / `description` / `keywords` / `image` / `url` revert to whatever they were before this `<Helmet>` mounted. `pageId` and `className` likewise restore from snapshots captured at mount.

`htmlAttributes` keys matching `on*` (event-handler attribute names) are stripped before anything is written to `<html>`. Cleanup diffs the live `<html>` attribute set against the snapshot and removes any key the render introduced before re-applying the snapshot. `lang` and `dir` are intentionally excluded from the diff so a localization layer that switched them mid-session keeps its value. See `skills/metadata.md` for the full list of affected tags.
