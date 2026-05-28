---
title: Which package?
description: A decision guide for which @mongez/* package solves the problem in front of you. Organised by user intent — find your situation, get the package.
---

This page is organised by what you're trying to *do*, not by package architecture. Find the closest match to your situation and follow the arrow.

If you're already happy with a different library (Jotai, Zustand, TanStack Query, Axios, Formik …) jump to the [escape hatch](#im-already-using-something-else) at the bottom — most `@mongez/*` packages compose fine alongside them.

## Foundations & utilities

### "I need utility functions / type guards"

→ **[`@mongez/reinforcements`](/reinforcements/overview/)** for ~130 typed helpers — deep clone, dot-notation reads/writes, async retries, debounce/throttle/memoize, walk/diff, randomness, and more.

→ **[`@mongez/supportive-is`](/supportive-is/overview/)** for type predicates — `isString`, `isEmail`, `isUrl`, `isJson`, `isEmpty`, `isBrowser`, plus 60+ more. Tree-shakable.

### "I need a chainable wrapper for an array"

→ **[`@mongez/collection`](/collection/overview/)**. Filter, sort, group, paginate, pluck, math helpers — 100+ methods over a single array reference. Lodash-shaped but TypeScript-first.

### "I need a generic event bus"

→ **[`@mongez/events`](/events/overview/)**.

```ts
import events from "@mongez/events";
events.subscribe("user.created", onCreate);
events.trigger("user.created", payload);
events.unsubscribeNamespace("user");  // bulk cleanup
```

## State

### "I need shared mutable state (vanilla TS, Vue, Node — anywhere)"

→ **[`@mongez/atom`](/atom/overview/)**. Framework-agnostic. Define an atom with a typed value and action methods; read/update from anywhere.

### "I need shared mutable state in React"

→ **[`@mongez/react-atom`](/react-atom/overview/)** — the React adapter for `@mongez/atom`.

Pick a preset atom if one fits your case:

- Toggle / modal-open flag → `openAtom("sidebar")`
- Loading flag → `loadingAtom("loginPending")`
- Fetch lifecycle (loading / data / error) → `fetchingAtom<User[]>("users")`
- Modal with payload → `portalAtom<{ userId: number }>("deleteUser")`

Otherwise `atom({ key, default, actions })` with custom action verbs.

### "I need to cache server data (React-Query-style)"

→ **[`@mongez/atomic-query`](/atomic-query/overview/)**.

- A single fetch → `useQuery({ queryKey, queryFn })`
- A POST / PUT / DELETE → `useMutation({ mutationFn })`
- Paginated / infinite scroll → `useInfiniteQuery({ ..., getNextPageParam })`
- Suspense boundary → `useSuspenseQuery({ ... })`

For SSR-rendered initial data, fetch in your framework's loader and pass to `<HydrateQueries entries={[...]}>`.

### "I need a value computed from other atoms"

→ **`@mongez/atom`**'s `derive(key, get => ...)`.

```ts
const fullName = derive("fullName", get => `${get(first)} ${get(last)}`);
```

Auto-tracks dependencies. Conditional reads work. Chained derives propagate.

### "I need to persist a user preference"

→ **`@mongez/atom`** with `persist: true` (localStorage) or `persist: PersistAdapter` (cookies, IndexedDB, [`@mongez/cache`](/cache/overview/), …).

### "I'm doing SSR and need per-request atom isolation"

→ Wrap your tree with **`@mongez/react-atom`**'s `<AtomStoreProvider>`.

For hydration, use `<HydrateAtomsScript>` on the server + `readHydration()` on the client.

## Data & networking

### "I need to make HTTP requests"

→ **[`@mongez/http`](/http/overview/)**. Native `fetch` under the hood, `{data, error}` result type (no exceptions for HTTP errors), per-request abort, response caching, interceptors, and a `RestfulResource` helper for CRUD.

### "I need to cache anything locally (browser)"

→ **[`@mongez/cache`](/cache/overview/)**. One API, swappable drivers: `localStorage`, `sessionStorage`, runtime memory, or any custom store. TTL, key prefixing, optional encryption. Pairs with `@mongez/atom`'s `persist:` field.

## Configuration & infrastructure

### "I need to manage app config"

→ **[`@mongez/config`](/config/overview/)**. Dot-notation reads / writes, deep-merge updates, TypeScript generics, namespace merging.

### "I need to load `.env` files (Node)"

→ **[`@mongez/dotenv`](/dotenv/overview/)**. Type coercion (number / boolean / null), `${VAR}` interpolation, NODE_ENV-specific files, shared defaults layer.

### "I need to encrypt or hash data"

→ **[`@mongez/encryption`](/encryption/overview/)**. Symmetric encrypt/decrypt for JSON-encodable values, plus md5 / sha1 / sha256 / sha512. Works in browser and Node.

### "I need DOM utilities (head, fonts, viewport, keyboard, dark mode)"

→ **[`@mongez/dom`](/dom/overview/)**. Inject stylesheets, scripts, and fonts; manage `<head>` elements; viewport dimensions; keyboard shortcuts; CSS variables.

### "I need to safely join URL segments"

→ **[`@mongez/concat-route`](/concat-route/overview/)**. Tiny, dependency-free. Concatenates any number of segments into a normalised leading-slash path; handles stray slashes, empty segments, falsy values, and full URLs.

### "I need to parse / serialise query strings"

→ **[`@mongez/query-string`](/query-string/overview/)**. Nested objects, arrays, plus a browser helper for reading and replacing the current URL.

## Internationalisation

### "I need translations / multi-language support"

→ **[`@mongez/localization`](/localization/overview/)** as the i18n primitive — translation dictionaries, placeholder interpolation, count-based plural rules, locale switching events.

→ **[`@mongez/react-localization`](/react-localization/overview/)** for the React bindings — `<Trans>`, `useTranslate`, JSX-aware placeholders, `transX` for component interpolation.

## React app concerns

### "I need `<head>` management in React"

→ **[`@mongez/react-helmet`](/react-helmet/overview/)**. Declarative `<Helmet>` component for titles, meta, OG/Twitter, canonical, and `<html>` attributes. Cleans up on unmount.

### "I need user / auth state"

→ **[`@mongez/user`](/user/overview/)**. Current-user pointer, permissions, access tokens, pluggable cache-driver storage, event hooks.

### "I need a configuration-based React router"

→ **[`@mongez/react-router`](/react-router/overview/)**. Routes declared as data, lazy-loaded apps/modules, typed navigation helpers, locale-aware routes, middleware, prefetch-on-hover, production chunk-error handling.

### "I need form validation in React"

→ **[`@mongez/react-form`](/react-form/overview/)**. `useFormControl`, validation rules, form events, submit-button state. React Native compatible.

## Developer tooling

### "I'm building a Vite SPA and want sensible defaults"

→ **[`@mongez/vite`](/vite/overview/)**. Typed env loading with NODE_ENV resolution, in-HTML env interpolation, tsconfig path aliasing, auto-open dev server, post-build zip, `.htaccess` generation, pre-render integration.

### "I need to build & publish a TypeScript npm package"

→ **[`@mongez/pkgist`](/pkgist/overview/)**. Build, version, and publish tool powered by tsdown (Rolldown-based). Standalone packages (independent versioning) or families (synchronised versioning), dual ESM+CJS output, file cloning, source snapshots, git tag + push automation, dry-run mode.

Installable in any TypeScript project — not specific to `@mongez/*`.

### "I'm building a CLI and want colors / spinners / progress bars / boxed messages"

→ **[`@mongez/copper`](/copper/overview/)**. Zero-dependency CLI toolkit. One install replaces `chalk` + `ora` + `cli-progress` + `boxen`: ANSI colors with a 20+ palette, spinners, known-total progress bars, themed loggers (`log.info` / `log.success` / `log.error`), boxed messages, OSC-8 hyperlinks, and ANSI stripping. `NO_COLOR` / `FORCE_COLOR` aware out of the box.

Installable in any TypeScript or Node project — not specific to `@mongez/*`.

### "I want one `AGENTS.md` to drive every coding agent on my project"

→ **[`@mongez/agent-kit`](/agent-kit/overview/)**. Derives Claude Code / Cursor / Copilot / Aider / Codex / Amp / … config files from a single `AGENTS.md`. Also syncs skills bundled inside installed npm packages into per-agent skill directories with collision-free flat folder names.

Installable in any project — not specific to `@mongez/*`.

## I'm already using something else

That's fine. Most `@mongez/*` packages can be adopted in isolation:

- Use **`@mongez/atom`** alongside Zustand or Redux if you like the action-shaped DX.
- Use **`@mongez/atomic-query`** alongside Jotai if you like its list-mutation helpers.
- Use **`@mongez/reinforcements`** instead of lodash — tree-shakable, smaller, TypeScript-first.
- Use **`@mongez/http`** alongside or instead of Axios — the `{data, error}` shape pairs especially well with TanStack Query.
- Use **`@mongez/pkgist`** to build *any* TS package, even ones outside the `@mongez/*` family.

The packages don't try to replace the JavaScript ecosystem — they offer a consistent shape that pairs well with each other and with everything else.
