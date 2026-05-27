---
title: Ecosystem map
description: All @mongez/* packages at a glance — what each does, how they relate, and when to reach for which.
---

The `@mongez/*` family is organised into four layers. Every package is independently installable; the layers only describe natural composition.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  React ecosystem                                                 │
  │  react-atom · atomic-query · react-router · react-form          │
  │  react-localization · react-helmet · user                       │
  └────────────────────────────┬────────────────────────────────────┘
                               │ builds on
  ┌────────────────────────────▼────────────────────────────────────┐
  │  Core libraries                                                  │
  │  atom · localization · dom · cache · config · dotenv            │
  │  encryption · concat-route · query-string                       │
  └────────────────────────────┬────────────────────────────────────┘
                               │ builds on
  ┌────────────────────────────▼────────────────────────────────────┐
  │  Foundations                                                     │
  │  events · reinforcements · supportive-is · collection           │
  └─────────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────────┐
  │  Build tooling (standalone)                                      │
  │  vite                                                            │
  └─────────────────────────────────────────────────────────────────┘
```

## State management

| Package | What it does |
|---|---|
| [`@mongez/atom`](/atom/getting-started/) | Framework-agnostic state primitive. Typed value + action methods + derived values + persistence + SSR stores + DevTools. |
| [`@mongez/react-atom`](/react-atom/getting-started/) | React adapter for `@mongez/atom`. Per-atom hooks, `<AtomStoreProvider>`, preset atoms (`openAtom`, `loadingAtom`, `fetchingAtom`, `portalAtom`). |
| [`@mongez/atomic-query`](/atomic-query/getting-started/) | Client-side query cache. `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, segment-aware invalidation, list-mutation helpers. |

## Foundations

| Package | What it does |
|---|---|
| [`@mongez/events`](/events/overview/) | Namespace-aware event bus. Used internally by `@mongez/atom`; usable standalone. |
| [`@mongez/reinforcements`](/reinforcements/overview/) | ~130 typed utility functions — arrays, objects, strings, numbers, async, lazy values, type guards. |
| [`@mongez/supportive-is`](/supportive-is/overview/) | Focused type-guard library: `isString`, `isArray`, `isEmail`, `isBrowser`, and 60+ more. |
| [`@mongez/collection`](/collection/overview/) | Fluent wrapper around arrays: filtering, sorting, grouping, pagination, string transforms, math helpers. |

## Infrastructure

| Package | What it does |
|---|---|
| [`@mongez/cache`](/cache/overview/) | Pluggable cache with drivers for localStorage, sessionStorage, runtime memory, and custom stores. Optional encryption. |
| [`@mongez/config`](/config/overview/) | Typed app config store. Dot-notation get/set, namespace merging, TypeScript generics. |
| [`@mongez/dotenv`](/dotenv/overview/) | `.env` file parser and loader — works in Node and browser build pipelines. |
| [`@mongez/encryption`](/encryption/overview/) | AES-256-GCM encrypt/decrypt, HMAC, MD5/SHA hashes — browser and Node compatible. |
| [`@mongez/concat-route`](/concat-route/overview/) | Safely joins URL path segments, handles leading/trailing slashes, preserves protocols. |
| [`@mongez/query-string`](/query-string/overview/) | Query-string parser and serialiser with nested object support. |
| [`@mongez/dom`](/dom/overview/) | DOM helpers: inject stylesheets/scripts/fonts, manage `<head>` elements, viewport utilities, keyboard shortcuts, dark mode. |
| [`@mongez/localization`](/localization/overview/) | Translation registry: pluralisation, interpolation, locale switching, event hooks. |

## React ecosystem

| Package | What it does |
|---|---|
| [`@mongez/react-localization`](/react-localization/overview/) | React bindings for `@mongez/localization`. `<Trans>`, `useTranslate`, `Trans.x` component helpers. |
| [`@mongez/react-router`](/react-router/overview/) | Router layer: lazy-loaded apps/modules, typed navigation helpers, locale-aware routes. |
| [`@mongez/react-helmet`](/react-helmet/overview/) | `<Helmet>` component for managing document `<head>` — title, meta, canonical, OG tags. |
| [`@mongez/react-form`](/react-form/getting-started/) | Form primitives: `useFormControl`, validation rules, form events, submit-button state. |
| [`@mongez/user`](/user/overview/) | User-session manager: current-user pointer, permissions, cache-driver storage, events. |

## Build tooling

| Package | What it does |
|---|---|
| [`@mongez/vite`](/vite/overview/) | Vite plugin suite: env loading, HTML env vars, production base URL, pre-rendering, `.htaccess` generation, build zip. |

## Dependency overview

- **No deps on the rest:** `events`, `reinforcements`, `supportive-is`, `collection`, `cache`, `config`, `dotenv`, `encryption`, `concat-route`, `query-string`, `dom`, `localization`, `vite`
- **Depends on `events` + `reinforcements`:** `atom`
- **Depends on `atom`:** `react-atom`
- **Depends on `react-atom`:** `atomic-query`
- **Depends on `localization`:** `react-localization`
- **Depends on `cache`:** `user`
