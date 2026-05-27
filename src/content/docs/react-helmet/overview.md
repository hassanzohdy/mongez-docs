---
title: "React Helmet"
name: mongez-react-helmet-overview
description: |
  High-level orientation to `@mongez/react-helmet` — what the package does, its mental model around the `<Helmet>` component and `HelmetProps` / `HelmetConfigurations`, scope boundaries vs `@mongez/dom`, component lifecycle, and SSR / `"use client"` constraints.
  TRIGGER when: user asks "what is @mongez/react-helmet", "how does @mongez/react-helmet differ from @mongez/dom", "can I use @mongez/react-helmet with Next.js App Router / SSR", or wants a package overview before diving into a specific API; `package.json` adds `@mongez/react-helmet` for the first time; `import ... from "@mongez/react-helmet"` appears with no prior context.
  SKIP: detailed component props (use `mongez-react-helmet-helmet`); the meta-tag mapping table (use `mongez-react-helmet-metadata`); app-wide config (use `mongez-react-helmet-configuration`); copy-paste examples (use `mongez-react-helmet-recipes`); `@mongez/dom` directly when working framework-agnostic outside React.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/react-helmet` is a React adapter over [`@mongez/dom`](https://github.com/hassanzohdy/dom)'s metadata module. It exposes one component — `<Helmet>` — that sets the document title (with optional app-name suffix), description, keywords, Open Graph / Twitter cards, canonical URL, favicon, and `<html>` attributes. The component is effect-only: it returns `null` and writes directly to `document.head` and `document.documentElement`.

## Install

```sh
yarn add @mongez/react-helmet
# peer: react >= 18, @mongez/dom >= 1.1.2
```

## Import pattern

```ts
import Helmet, {
  setHelmetConfigurations,
  getHelmetConfigurations,
  getHelmetConfig,
  type HelmetProps,
  type HelmetConfigurations,
} from "@mongez/react-helmet";
```

## Mental model

| Concept | Type | Mental model |
|---|---|---|
| `<Helmet>` | Component, returns `null` | Side-effect renderer — every prop maps to an effect that writes one or more tags to `<head>`. |
| `HelmetProps` | Object | Per-instance settings. Each maps to a known set of tags (see `metadata.md`). |
| `setHelmetConfigurations` | Function | App-wide defaults. Per-call props win when both are provided. |
| `translationFunction` | Config | Optional `(key) => string` — auto-translates the title and `appName`. |

## Scope boundaries

| Concern | Lives where | Why |
|---|---|---|
| The DOM-level title / meta writers | `@mongez/dom` | Framework-agnostic |
| The React component + config singleton | `@mongez/react-helmet` | This package |
| Translation strings | `@mongez/localization` | Pluggable; provide via `translationFunction` |

## Lifecycle in one diagram

```
<Helmet title=… description=… />
   |
   v
mount  →  one effect per prop  →  writes to document.head / documentElement
   |
   v
re-render with new prop  →  effect with that prop in deps re-runs  →  overwrites the tag
   |
   v
unmount  →  each effect's cleanup restores the mount-time snapshot
              (title / description / keywords / image / url / pageId /
               className / htmlAttributes all restore reliably)
```

## Browser-only

The component file accesses `document.documentElement` at the module top level. To use under SSR frameworks, wrap the import in a `"use client"` boundary (Next.js App Router) or a `dynamic(..., { ssr: false })` import (Pages Router / Remix).
