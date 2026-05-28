---
title: "Http"
description: "API reference for the Http class — constructor, request methods, configuration, lifecycle hooks."
sidebar:
  order: 10
  label: "Http"
---

The `Http` class is the entire client. Construct one instance per "client" you need (one per API base URL, typically), reuse it everywhere. Every request method returns a [`CancellablePromise`](../cancellable-promise/) that resolves to an [`HttpResult<T>`](../http-result/) — the typed `{ data, error }` discriminated union.

For the narrative guide on **how** to use these methods, see **[HTTP client](../../http-client/)**. This page documents every public method's exact signature.

## Import

```ts
import { Http } from "@mongez/http";
```

## Constructor

### `new Http(config?)`

```ts
new Http(config?: HttpConfig): Http
```

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `config` | `HttpConfig` _(optional)_ | Per-instance configuration. See [`HttpConfig`](../http-config/) for every field. |

**Returns:** A new `Http` instance.

**Example**

```ts
const http = new Http({
  baseURL: "https://api.example.com",
  auth: () => `Bearer ${getToken()}`,
  timeout: 10_000,
});
```

## Request methods

Every method below returns `CancellablePromise<HttpResult<T>>`. The promise resolves to `{ data: T, error: null }` on 2xx, or `{ data: null, error: HttpError }` on any failure. Pass `{ throw: true }` in `options` to throw the `HttpError` instead.

### `get<T>(path, options?)`

```ts
get<T>(path: string, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

GET request. Automatically deduplicated — concurrent calls to the same URL share one underlying `fetch`. Each caller still gets its own cancellable promise.

### `post<T>(path, data?, options?)`

```ts
post<T>(path: string, data?: HttpData, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

POST request. `data` is serialised via the configured serializer (JSON by default). `FormData`, `Blob`, and `string` pass through untouched.

### `put<T>(path, data?, options?)`

```ts
put<T>(path: string, data?: HttpData, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

PUT request. When `config.putToPost === true`, the request is sent as POST with `_method=PUT` appended — see [`HttpConfig.putToPost`](../http-config/#puttopost).

### `patch<T>(path, options?)`

```ts
patch<T>(path: string, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

PATCH request. Pass the body via `options.data` (not a third positional argument — PATCH historically allows method-only requests).

### `delete<T>(path, options?)`

```ts
delete<T>(path: string, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

DELETE request. Pass an optional body via `options.data`.

### `head(path, options?)`

```ts
head(path: string, options?: RequestOptions): CancellablePromise<HttpResult<null>>
```

HEAD request. Response body is never read. `data` is always `null` on success.

### `options<T>(path, options?)`

```ts
options<T>(path: string, options?: RequestOptions): CancellablePromise<HttpResult<T>>
```

OPTIONS request. Useful for CORS preflight inspection.

### `request<T>(method, path, data?, options?)`

```ts
request<T>(
  method: HttpMethod | string,
  path: string,
  data?: HttpData,
  options?: RequestOptions,
): CancellablePromise<HttpResult<T>>
```

The general-purpose escape hatch. Every convenience method above delegates here. Use it for non-standard verbs (`PROPFIND`, `REPORT`, etc.) or when the method is dynamic.

### `stream<T>(path, options?)`

```ts
stream<T>(path: string, options?: StreamRequestOptions): CancellableAsyncIterable<T>
```

Open a stream. See **[Streaming](../../streaming/)** for SSE, NDJSON, and raw `ReadableStream` patterns.

## Concurrent helpers

### `all<T>(requests)`

```ts
all<T>(requests: CancellablePromise<T>[]): CancellablePromise<T[]>
```

Wait for every request to settle. Never throws — per-request errors stay on each result. Cancelling the returned promise cancels every inner request.

### `race<T>(requests)`

```ts
race<T>(requests: CancellablePromise<T>[]): CancellablePromise<T>
```

Resolve with the first request to settle. Losers are automatically cancelled.

## Cache management

See **[Caching](../../caching/)** for driver setup and per-request cache options.

### `invalidate(key)`

```ts
invalidate(key: string): Promise<void>
```

Remove a single cache entry by key.

### `invalidateAll()`

```ts
invalidateAll(): Promise<void>
```

Clear every cache entry. Requires the configured `CacheDriver` to implement `clear()`.

## Configuration

### `extend(overrides)`

```ts
extend(overrides: HttpConfig): Http
```

Returns a **new** `Http` instance with the receiver's config merged with `overrides`. Interceptors, events, and the cache driver carry over. Use this instead of `new Http(...)` when you only need to tweak one or two fields.

### `getConfig()`

```ts
getConfig(): Readonly<HttpConfig>
```

Return the effective config — useful for debugging or for re-creating the instance with one field replaced.

## Interceptors

See **[Interceptors](../../interceptors/)** for the full flow and ordering rules.

### `before(fn)`

```ts
before(fn: BeforeInterceptor): this
```

Run `fn` before each outgoing request. The interceptor may mutate the request (headers, params, body) or return a new one.

### `after<T>(fn)`

```ts
after<T>(fn: AfterInterceptor<T>): this
```

Run `fn` after each request settles — **on both success and error results**. Perfect for global toasts, refresh-token flows, telemetry.

## Events

### `on(event, handler)` / `off(event, handler)`

```ts
on(event: string, handler: HttpEventHandler): this
off(event: string, handler: HttpEventHandler): this
```

Subscribe / unsubscribe to lifecycle events. Standard events emitted: `request:start`, `request:end`, `request:error`, `request:cache-hit`, `request:retry`. See **[Interceptors → Events](../../interceptors/#events)**.

## See also

- **[HttpError](../http-error/)** — the typed error class returned in `error`
- **[Resource](../resource/)** — zero-boilerplate REST CRUD on top of `Http`
- **[HttpConfig](../http-config/)** — every constructor option in detail
- **[RequestOptions](../request-options/)** — per-call options
- Guide: **[HTTP client](../../http-client/)** — narrative walkthrough with patterns
- Guide: **[Recipes](../../recipes/)** — common app-level patterns
