---
title: Ecosystem map
description: All @mongez/* packages at a glance — what each does, how they relate, and when to reach for which.
---

The `@mongez/*` family is organised into four architectural layers. Every package is independently installable; the layers only describe natural composition.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  React ecosystem                                                 │
  │  react-atom · atomic-query · react-router · react-form          │
  │  react-localization · react-helmet · user                       │
  └────────────────────────────┬────────────────────────────────────┘
                               │ builds on
  ┌────────────────────────────▼────────────────────────────────────┐
  │  Core libraries                                                  │
  │  atom · http · cache · config · dotenv · encryption · dom       │
  │  concat-route · query-string · localization                     │
  └────────────────────────────┬────────────────────────────────────┘
                               │ builds on
  ┌────────────────────────────▼────────────────────────────────────┐
  │  Foundations                                                     │
  │  events · reinforcements · supportive-is · collection           │
  └─────────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────────┐
  │  Build & AI tooling (standalone, install in any project)         │
  │  vite · pkgist · agent-kit                                       │
  └─────────────────────────────────────────────────────────────────┘
```

The seven thematic groups below cut the same set of packages by purpose rather than dependency direction. Use this view to decide what to install; use the layered diagram above to understand what depends on what.

## Foundations

The non-React utility belt every other `@mongez/*` package builds on. Zero `@mongez/*` peers — installable into any project.

| Package | What it does |
|---|---|
| [`@mongez/events`](/events/overview/) | Namespace-aware event bus. Used internally by `@mongez/atom`; usable standalone. |
| [`@mongez/reinforcements`](/reinforcements/overview/) | ~130 typed utility functions — arrays, objects, strings, numbers, async, lazy values, type guards. |
| [`@mongez/supportive-is`](/supportive-is/overview/) | Focused type-guard library: `isString`, `isArray`, `isEmail`, `isBrowser`, and 60+ more. |
| [`@mongez/collection`](/collection/overview/) | Fluent wrapper around arrays — filter, sort, group, paginate, pluck, math, and 100+ helpers over a single array reference. |

## State management

| Package | What it does |
|---|---|
| [`@mongez/atom`](/atom/overview/) | Framework-agnostic state primitive. Typed value + action methods + derived values + persistence + SSR stores + DevTools. |
| [`@mongez/react-atom`](/react-atom/overview/) | React adapter for `@mongez/atom`. Per-atom hooks, `<AtomStoreProvider>`, preset atoms (`openAtom`, `loadingAtom`, `fetchingAtom`, `portalAtom`). |
| [`@mongez/atomic-query`](/atomic-query/overview/) | Client-side query cache built on `@mongez/react-atom`. `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, segment-aware invalidation, list-mutation helpers. |

## Data & Networking

| Package | What it does |
|---|---|
| [`@mongez/http`](/http/overview/) | Robust, fetch-based HTTP client — `{data, error}` result type, per-request abort, response caching, interceptors, and a `RestfulResource` CRUD helper. No Axios. |
| [`@mongez/cache`](/cache/overview/) | Pluggable cache facade with drivers for localStorage, sessionStorage, runtime memory, and custom stores. Optional encryption. PersistAdapter-compatible with `@mongez/atom`. |

## Infrastructure

| Package | What it does |
|---|---|
| [`@mongez/config`](/config/overview/) | Typed app config tree. Dot-notation get/set, deep-merge writes, TypeScript generics. |
| [`@mongez/dotenv`](/dotenv/overview/) | `.env` parser/loader for Node — type coercion, `${VAR}` interpolation, NODE_ENV-aware file resolution, shared defaults. |
| [`@mongez/encryption`](/encryption/overview/) | Symmetric encrypt/decrypt for JSON-encodable values plus md5/sha1/sha256/sha512 hashes — browser and Node compatible. |
| [`@mongez/dom`](/dom/overview/) | Browser-side DOM helpers — page metadata, fonts, stylesheets, CSS variables, keyboard shortcuts, viewport dimensions. |
| [`@mongez/concat-route`](/concat-route/overview/) | Dependency-free path joiner — normalises segments, handles stray slashes, preserves protocols. |
| [`@mongez/query-string`](/query-string/overview/) | Query-string parse/serialize with nested-object and array support, plus a browser helper for reading and replacing the current URL. |

## Internationalisation

| Package | What it does |
|---|---|
| [`@mongez/localization`](/localization/overview/) | Framework-agnostic i18n primitive — translation dictionaries, placeholder interpolation, count-based plural rules, locale switching events. |
| [`@mongez/react-localization`](/react-localization/overview/) | React bindings for `@mongez/localization`. `<Trans>`, `useTranslate`, JSX-aware placeholder interpolation, `transX` helper. |

## React ecosystem

| Package | What it does |
|---|---|
| [`@mongez/react-router`](/react-router/overview/) | Configuration-based React router — lazy-loaded apps/modules, typed navigation helpers, locale-aware routes, middleware, prefetch-on-hover, production chunk-error handling. |
| [`@mongez/react-form`](/react-form/overview/) | React form primitives — `useFormControl`, validation rules, form events, submit-button state. React Native compatible. |
| [`@mongez/react-helmet`](/react-helmet/overview/) | Declarative document `<head>` manager — titles, descriptions, OG/Twitter meta, canonical URL, `<html>` attributes. Cleans up on unmount. |
| [`@mongez/user`](/user/overview/) | Framework-agnostic user/auth state — current-user pointer, permissions, access tokens, pluggable cache-driver storage, event hooks. |

## Build & AI tooling

Standalone tools — install into any TypeScript project, Mongez or otherwise.

| Package | What it does |
|---|---|
| [`@mongez/vite`](/vite/overview/) | Drop-in Vite plugin suite for SPAs — typed env loading with NODE_ENV resolution, in-HTML env interpolation, tsconfig path aliasing, auto-open dev server, post-build zip, `.htaccess` generation, pre-render integration. |
| [`@mongez/pkgist`](/pkgist/overview/) | Build, version, and publish tool for TypeScript npm packages. Powered by tsdown (Rolldown-based). Standalone packages or version-synchronised families, dual ESM+CJS output, git tag + push automation, dry-run mode. |
| [`@mongez/agent-kit`](/agent-kit/overview/) | Authoring and distribution toolkit for AI coding agents. Derives every tool-specific config file (Claude Code, Cursor, Copilot, Aider, Codex, …) from a single `AGENTS.md`. Syncs skills bundled in npm packages into per-agent skill directories. |

## Dependency overview

How the packages reference each other. Every package is otherwise standalone — you can install any one without dragging the others along.

**No `@mongez/*` internal deps** (pure standalones):
`events` · `reinforcements` · `supportive-is` · `concat-route` · `dotenv` · `dom` · `encryption` · `query-string` · `pkgist` · `agent-kit`

**Built on Foundations:**
- `atom` → `events`, `reinforcements`
- `collection` → `reinforcements`, `supportive-is`
- `config` → `reinforcements`
- `localization` → `events`, `reinforcements`
- `user` → `events`, `reinforcements`

**Built on Core libraries:**
- `cache` → `encryption`
- `http` → `concat-route`
- `react-atom` → `atom`
- `react-helmet` → `dom`
- `react-localization` → `localization`
- `react-router` → `concat-route`, `events`

**Built on React layer:**
- `atomic-query` → `events`, `react-atom`
- `react-form` → `events`, `supportive-is`, `localization`, `reinforcements`

**Build tooling deps:**
- `vite` → `dotenv`, `events`, `reinforcements`, plus a small CLI / filesystem helper layer that's package-internal and not part of the public `@mongez/*` surface. You don't install those directly.
