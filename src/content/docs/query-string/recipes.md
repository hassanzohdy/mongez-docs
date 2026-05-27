---
title: "Recipes"
name: mongez-query-string-recipes
description: |
  End-to-end usage patterns for `@mongez/query-string` combining `parse`, `all`, `get`, `toQueryString`, and `update` — URL-driven filters, pagination, multi-select facets, safe round-trips with `encodeURIComponent`, resetting the query, `pushState` vs `replaceState`, server-side parsing, store sync via `popstate`, and composing with `concatRoute` from `@mongez/concat-route`.
  TRIGGER when: code combines multiple `queryString.*` calls in one feature; user asks "how do I build URL-driven filters", "how do I do pagination in the URL", "how do I sync URL state with a store", "how do I round-trip values with `&` or `%`", "how do I push a history entry instead of replace", or "how do I parse a query string server-side"; `import queryString from "@mongez/query-string"` alongside `concatRoute` or store/router code.
  SKIP: single-method semantics for parsing — use `mongez-query-string-parse`; single-method semantics for serializing/updating — use `mongez-query-string-serialize`; package orientation — use `mongez-query-string-overview`; React-aware URL hooks (`@mongez/react-router`); pure URL/path joining without query strings (`@mongez/concat-route` on its own); generic state-management or form-state tutorials.
sidebar:
  order: 99
---

Cross-feature compositions for `@mongez/query-string`.

## URL-driven filters

The classic pattern: a list page where every filter, sort, and page number lives in the URL. Refresh-safe and shareable.

```ts
import queryString from "@mongez/query-string";

type Filters = {
  tag?: string;
  sort?: "price-asc" | "price-desc" | "newest";
  page?: number;
};

function readFilters(): Filters {
  return queryString.all() as Filters;
}

function writeFilters(next: Filters) {
  queryString.update(next as Record<string, any>);
}

// User picks a tag — start over at page 1.
const current = readFilters();
writeFilters({ ...current, tag: "books", page: 1 });
```

## Pagination

```ts
const page = (queryString.get("page", 1) as number);

function goToPage(n: number) {
  queryString.update({ ...queryString.all(), page: n });
}

goToPage(page + 1);
```

## Multi-select facet

Render a list of tags. Each tag toggles in/out of the URL's `tags[]` array.

```ts
function getSelectedTags(): string[] {
  const tags = (queryString.get("tags") as string[] | null) ?? [];
  return Array.isArray(tags) ? tags : [tags];
}

function toggleTag(tag: string) {
  const current = getSelectedTags();
  const next = current.includes(tag)
    ? current.filter(t => t !== tag)
    : [...current, tag];
  queryString.update({ ...queryString.all(), tags: next });
}
```

If the user has a single selection, `queryString.all()` returns it as an array (because of `tags[]`). Wrap defensively as above.

## Safe round-trip for arbitrary values

The serializer calls `encodeURIComponent` on each value, so reserved characters round-trip cleanly without any call-site pre-encoding:

```ts
queryString.update({ q: "a&b", category: "books / fiction" });
// URL: /list?q=a%26b&category=books%20%2F%20fiction
```

Pre-encoding yourself would double-encode (`%2526` instead of `%26`). Pass raw strings.

On the way back, values come out of `parse` already decoded — but only for non-numeric values. If your encoded string happens to look numeric (`"42"`), the parser will coerce it to `42` without decoding. Round-trip safely by keeping ID-like fields under a non-numeric key prefix, or encode them server-side as `id-42` rather than `42`.

## Reset query string

```ts
queryString.update({});                       // clears the query, keeps the pathname
```

If you also want to reset to a known starting set:

```ts
queryString.update({ page: 1 });              // /list?page=1
```

## Conditional history push vs replace

`update` is hard-coded to `replaceState`. For a real navigation that creates a back-button entry, use `pushState` directly:

```ts
function navigateToFilters(next: Record<string, any>) {
  const qs = queryString.toQueryString(next);
  const url = `${location.pathname}${qs ? "?" + qs : ""}`;
  history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

The synthetic `popstate` lets routers / listeners react as if the user navigated. Use sparingly — it's a workaround, not a stable contract.

## Server-side parse

`parse` doesn't touch `window`, so it works in Node, Workers, or any non-browser runtime. Use it for testing or for server-side rendering filters from a request URL:

```ts
import queryString from "@mongez/query-string";

function getFiltersFromRequest(reqUrl: string): Record<string, any> {
  const queryIndex = reqUrl.indexOf("?");
  if (queryIndex < 0) return {};
  return queryString.parse(reqUrl.substring(queryIndex));
}
```

Do NOT call `all` / `get` / `update` / `toString` on the server — they reference `window.location` / `window.history` and will throw.

## Sync URL state with another store

Because `update` calls `replaceState` (no `popstate` fires), one-way write from your store to the URL is straightforward. The other direction — URL to store — needs to happen at mount:

```ts
function syncStoreFromUrl() {
  store.setFilters(queryString.all());
}

window.addEventListener("DOMContentLoaded", syncStoreFromUrl);
window.addEventListener("popstate", syncStoreFromUrl);   // back/forward buttons
```

`popstate` fires on real navigation (back/forward), so this catches user-driven history changes that `update` itself doesn't make.

## Composing with `@mongez/concat-route`

For URL building beyond the query string — joining path segments, normalizing slashes — pair with `@mongez/concat-route`:

```ts
import { concatRoute } from "@mongez/concat-route";
import queryString from "@mongez/query-string";

function buildUrl(base: string, path: string, params: Record<string, any>) {
  const qs = queryString.toQueryString(params);
  return concatRoute(base, path) + (qs ? "?" + qs : "");
}
```
