---
title: "Metadata"
name: mongez-react-helmet-metadata
description: |
  Reference mapping every `<Helmet>` prop (`title`, `description`, `keywords`, `image`, `url`, `htmlAttributes`, `pageId`, `className`) to the exact `<title>`, `<meta>`, and `<link>` tags it produces in the DOM — Open Graph, Twitter Card, `itemprop`, and `<html>` attribute effects.
sidebar:
  order: 50
---

Each `<Helmet>` prop maps to a fixed set of `<title>` / `<meta>` / `<link>` writes. The actual write functions live in `@mongez/dom`'s `src/metadata.ts`; this page is a reference for which props produce which tags.

## `title` → many

```tsx
<Helmet title="Article Page" appendAppName={false} />
```

| Tag | Source |
|---|---|
| `document.title = "Article Page"` | direct property write |
| `<meta property="og:title" content="Article Page">` | `meta("og:title", …)` |
| `<meta property="og:image:alt" content="Article Page">` | `meta("og:image:alt", …)` |
| `<meta property="twitter:title" content="Article Page">` | `meta("twitter:title", …)` |
| `<meta property="twitter:image:alt" content="Article Page">` | `meta("twitter:image:alt", …)` |
| `<meta itemprop="name" content="Article Page">` | `itemprop("name", …)` |

When `appendAppName` is true and `appName` is configured (or passed), the value written is `title + appNameSeparator + appName`.

## `description` → 4 tags

```tsx
<Helmet title="…" description="A short description" />
```

| Tag |
|---|
| `<meta name="description" content="A short description">` |
| `<meta itemprop="description" content="A short description">` |
| `<meta property="og:description" content="A short description">` |
| `<meta property="twitter:description" content="A short description">` |

## `keywords` → 1 tag

```tsx
<Helmet title="…" keywords="react, helmet, seo" />
// or:
<Helmet title="…" keywords={["react", "helmet", "seo"]} />
```

| Tag |
|---|
| `<meta name="keywords" content="...">` |

Arrays are joined with a literal `,` (no space). If you want comma-and-space separation, pass a string.

## `image` → 4 tags

```tsx
<Helmet title="…" image="/cover.png" />
```

| Tag |
|---|
| `<meta property="image" content="/cover.png">` |
| `<meta property="og:image" content="/cover.png">` |
| `<meta property="twitter:image" content="/cover.png">` |
| `<meta itemprop="image" content="/cover.png">` |

## `url` → 3 tags

```tsx
<Helmet title="…" url="https://example.com/page" />
```

| Tag |
|---|
| `<link rel="canonical" href="https://example.com/page">` |
| `<meta property="og:url" content="https://example.com/page">` |
| `<meta property="twitter:url" content="https://example.com/page">` |

- `url={true}` → uses `window.location.href` as the value.
- `url` as a string → uses that exact string.
- `url={false}` (and `null` / `""`) → the canonical-url effect short-circuits and leaves the existing canonical link untouched.

## `htmlAttributes` → `<html>` attributes

```tsx
<Helmet title="…" htmlAttributes={{ lang: "en", dir: "ltr", "data-app": "mine" }} />
```

Each entry becomes `document.documentElement.setAttribute(key, value)`.

Keys starting with `on` (case-insensitive) are **stripped** and never reach the DOM — `setAttribute("onclick", …)` would install a live inline event handler, so an attacker-influenced key would be script execution. Attach handlers with `addEventListener` in an effect instead.

On unmount, the cleanup diffs the live `<html>` attribute set against the snapshot taken at mount and removes any attribute the render introduced before re-applying the snapshot.

`lang` and `dir` are intentionally **not** restored from the snapshot, so localization layers that switch lang/dir outside `<Helmet>` keep their value.

## `pageId` → `<html>.id`

```tsx
<Helmet title="…" pageId="dashboard" />
// document.documentElement.id === "dashboard"
```

Restored on unmount to the id present at mount.

## `className` → `<html>.classList`

```tsx
<Helmet title="…" className="route-dashboard theme-dark" />
// classList contains "route-dashboard" and "theme-dark"
```

Each whitespace-separated token is `classList.add`'d. On unmount, the entire `className` string is restored to the snapshot taken at mount.

## Verifying in tests

```ts
// document.title — string
expect(document.title).toBe("Article Page");

// meta by property
expect(
  document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")
).toBe("Article Page");

// meta by name (only for description / keywords)
expect(
  document.head.querySelector('meta[name="description"]')?.getAttribute("content")
).toBe("…");

// meta by itemprop
expect(
  document.head.querySelector('meta[itemprop="name"]')?.getAttribute("content")
).toBe("…");

// link canonical
expect(
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")
).toBe("https://example.com/page");

// html attributes / id / class
expect(document.documentElement.getAttribute("lang")).toBe("en");
expect(document.documentElement.id).toBe("dashboard");
expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
```
