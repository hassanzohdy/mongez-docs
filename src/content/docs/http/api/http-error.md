---
title: "HttpError"
description: "API reference for the HttpError class — status, body, headers, and the full predicate set."
sidebar:
  order: 20
  label: "HttpError"
---

`HttpError` is the typed error class returned in the `error` slot of every [`HttpResult`](../http-result/). It's also what gets thrown when you opt in with `{ throw: true }`. Predicates are getters — call them without parentheses.

For the narrative guide on common error-handling patterns, see **[Error handling](../../error-handling/)**.

## Import

```ts
import { HttpError } from "@mongez/http";
```

## Class signature

```ts
class HttpError extends Error {
  readonly status: number | null;
  readonly body: unknown;
  readonly response: Response | null;
  readonly isAborted: boolean;
  readonly isTimeout: boolean;
  readonly isNetwork: boolean;
  readonly headers: Record<string, string> | null;
  readonly request: OutgoingRequest | null;

  // Status predicates (getters — no `()`):
  get isClientError(): boolean;      // 4xx
  get isServerError(): boolean;      // 5xx
  get isUnauthorized(): boolean;     // 401
  get isForbidden(): boolean;        // 403
  get isNotFound(): boolean;         // 404
  get isValidationError(): boolean;  // 422
  get isRateLimited(): boolean;      // 429

  toJSON(): Record<string, unknown>;
}
```

## Properties

| Name | Type | Description |
|------|------|-------------|
| `status` | `number \| null` | HTTP status code, or `null` for network/abort/timeout errors. |
| `body` | `unknown` | Parsed response body — JSON when `Content-Type: application/json`, else raw text. |
| `response` | `Response \| null` | The raw `Response` object, if one was received. |
| `headers` | `Record<string, string> \| null` | Response headers as a plain object. `null` when no response was received. |
| `request` | `OutgoingRequest \| null` | The request that triggered this error. **Warning:** may contain sensitive headers (`Authorization`, `Cookie`). Do not log without redacting. |
| `isAborted` | `boolean` | The request was cancelled via `AbortController` or `.cancel()`. |
| `isTimeout` | `boolean` | The request hit the configured timeout. |
| `isNetwork` | `boolean` | DNS, CORS, or other network-level failure (no HTTP response received). |

## Status predicates

All are **getters** — write `error.isNotFound`, never `error.isNotFound()`.

| Predicate | True when status is |
|-----------|---------------------|
| `isClientError` | 400 ≤ status < 500 |
| `isServerError` | 500 ≤ status < 600 |
| `isUnauthorized` | 401 |
| `isForbidden` | 403 |
| `isNotFound` | 404 |
| `isValidationError` | 422 (typical for form errors with field details in `body`) |
| `isRateLimited` | 429 |

For statuses without a dedicated predicate (`409 Conflict`, `503 Service Unavailable`, etc.), compare `error.status` directly.

## Methods

### `toJSON()`

```ts
toJSON(): Record<string, unknown>
```

JSON-safe serialisation. **Intentionally omits `request`** to avoid leaking `Authorization` / `Cookie` headers into logs. Includes `status`, `body`, `headers`, and the three boolean flags.

```ts
log.error({ err: error.toJSON() }); // safe to ship to logs
```

## Recognising specific failure modes

```ts
const { data, error } = await http.get<User>(`/users/${id}`);

if (error) {
  // Cancellation — user navigated away mid-request
  if (error.isAborted) return;

  // Network problem — no HTTP response at all
  if (error.isNetwork) return showOffline();

  // Timeout
  if (error.isTimeout) return showSlowConnection();

  // Status-based branches
  if (error.isNotFound)         return null;
  if (error.isUnauthorized)     return router.go("/login");
  if (error.isForbidden)        return showPermissionDenied();
  if (error.isValidationError)  return showErrors(error.body);
  if (error.isRateLimited)      return scheduleRetry(error.headers?.["retry-after"]);
  if (error.isServerError)      return showServerDown();

  // Catch-all
  return toast.error(error.message);
}
```

## See also

- **[Http](../http/)** — the client class that returns `HttpError` in results
- **[HttpResult](../http-result/)** — the discriminated union containing `error`
- Guide: **[Error handling](../../error-handling/)** — patterns, refresh-token flows, validation rendering
