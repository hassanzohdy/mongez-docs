---
title: "Resource"
description: "API reference for the Resource class — RESTful CRUD operations and per-record actions."
sidebar:
  order: 30
  label: "Resource"
---

`Resource` is a thin abstract base for CRUD APIs. Subclass it, set an `endpoint` and (optionally) bind an `Http` instance, and you get typed `list` / `get` / `create` / `update` / `delete` / `publish` for free. Resources resolve their `Http` instance lazily — `setCurrentHttp(...)` once at app bootstrap and every `Resource` subclass picks it up.

For the narrative guide, see **[Resource](../../resource/)**.

## Import

```ts
import { Resource } from "@mongez/http";
```

## Subclassing

```ts
import { Resource } from "@mongez/http";

class UsersResource extends Resource {
  route = "/users";
}

export const usersResource = new UsersResource();
```

That's the entire setup. Every method below works on `usersResource`.

## Properties

| Name | Type | Description |
|------|------|-------------|
| `route` | `string` | Base path for the resource, e.g. `"/users"`. Required. |

## Instance methods

Every method below returns `CancellablePromise<HttpResult<T>>`. Pass `options.throw = true` to throw `HttpError` instead.

### `list(params?, options?)`

```ts
list(
  params?: HttpParams,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`GET {route}?{params}` — fetch a paginated or filtered list. `params` becomes the query string.

### `get(id, options?)`

```ts
get(
  id: number | string,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`GET {route}/{id}` — fetch a single record.

### `create(data, options?)`

```ts
create(
  data: HttpData,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`POST {route}` with `data` as the body.

### `update(id, data, options?)`

```ts
update(
  id: number | string,
  data: HttpData,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`PUT {route}/{id}` — full replacement. With `putToPost: true` on the bound `Http`, this is sent as POST + `_method=PUT` automatically.

### `patch(id, options?)`

```ts
patch(
  id: number | string,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`PATCH {route}/{id}` — partial update. Pass the body via `options.data`.

### `delete(id, options?)`

```ts
delete(
  id: number | string,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`DELETE {route}/{id}`.

### `bulkDelete(data, options?)`

```ts
bulkDelete(
  data: HttpData,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`DELETE {route}` with `data` (typically `{ ids: [...] }`) as the body.

### `publish(id, published, publishKey?, options?)`

```ts
publish(
  id: number | string,
  published: boolean | HttpData,
  publishKey?: string,
  options?: RequestOptions,
): CancellablePromise<HttpResult<unknown>>
```

`PATCH {route}/{id}` with `{ [publishKey]: published }` in the body. Defaults `publishKey` to the bound `Http`'s `config.publishKey` (default: `"published"`).

### `action<T>(id, actionName, data?, options?, method?)`

```ts
action<T = unknown>(
  id: number | string,
  actionName: string,
  data?: HttpData,
  options?: RequestOptions,
  method?: HttpMethod,
): CancellablePromise<HttpResult<unknown>>
```

`{method} {route}/{id}/{actionName}` — for non-CRUD endpoints like `POST /users/42/reset-password`. Default method is `POST`.

### `path(suffix?)`

```ts
path(suffix?: string | number): string
```

Build a full path relative to `route`. `path()` returns `"/users"`; `path(42)` returns `"/users/42"`; `path("export")` returns `"/users/export"`.

### `actionPath(id, actionName)`

```ts
actionPath(id: string | number, actionName: string): string
```

Build the path for a named action — `actionPath(42, "reset-password")` returns `"/users/42/reset-password"`.

## Binding to a specific Http instance

By default, a `Resource` uses whatever `Http` was registered via `setCurrentHttp(...)`. To pin a resource to a specific instance:

```ts
class AdminUsersResource extends Resource {
  route = "/users";
}

const adminHttp = new Http({ baseURL: "https://admin.api.com" });
export const adminUsers = new AdminUsersResource().useHttp(adminHttp);
```

## See also

- **[Http](../http/)** — the underlying client
- **[ResourceService](../resource-service/)** — interface every Resource implements
- Guide: **[Resource](../../resource/)** — narrative walkthrough with examples
