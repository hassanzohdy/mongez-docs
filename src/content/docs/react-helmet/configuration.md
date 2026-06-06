---
title: "Configuration"
name: mongez-react-helmet-configuration
description: |
  Reference for `setHelmetConfigurations`, `getHelmetConfigurations`, and `getHelmetConfig` — the app-wide config API including translation integration and prop resolution order.
sidebar:
  order: 17
---

```ts
import {
  setHelmetConfigurations,
  getHelmetConfigurations,
  getHelmetConfig,
  type HelmetConfigurations,
} from "@mongez/react-helmet";
```

## The shape

```ts
type HelmetConfigurations = {
  appName?: string;
  appendAppName?: boolean;              // default: true
  appNameSeparator?: string;            // default: " | "
  url?: boolean;                        // default: true (auto-canonicalize)
  htmlAttributes?: Record<string, any>;
  className?: string;
  translatable?: boolean;               // default: true
  translateAppName?: boolean;           // default: true
  translationFunction?: (key: string) => string;
};
```

## `setHelmetConfigurations(partial)`

Call once at app boot. The partial is **shallow-merged** with the existing config — fields you don't pass keep their prior value.

```ts
setHelmetConfigurations({
  appName: "My Online Store",
  appendAppName: true,
  appNameSeparator: " | ",
  translatable: true,
  translateAppName: true,
  translationFunction: (key) => i18n.t(key),
});
```

Order of resolution for any prop that exists in both `HelmetProps` and `HelmetConfigurations`:

1. The value on the `<Helmet>` prop (if not `undefined`).
2. Otherwise, the value from `getHelmetConfigurations()`.
3. Otherwise, the documented default (e.g., `appendAppName: true`, `appNameSeparator: " | "`).

## `getHelmetConfigurations()`

Returns the entire current config object.

```ts
const cfg = getHelmetConfigurations();
console.log(cfg.appName);
```

## `getHelmetConfig(key?, defaultValue?)`

Read a single key with an optional fallback.

```ts
getHelmetConfig("appName");                  // → "My Online Store"
getHelmetConfig("appName", "fallback");      // → "fallback" if appName is unset
```

Internally uses `||`, so any falsy value (`false`, `""`, `0`) falls through to the default. If you depend on `getHelmetConfig("appendAppName")` returning `false`, beware: it will return whatever you pass as `defaultValue` (or `null`) instead.

## Translation

```ts
import { trans } from "@mongez/localization";

setHelmetConfigurations({
  appName: "appName",                  // translation key, not literal text
  translatable: true,
  translateAppName: true,
  translationFunction: trans,
});
```

Then in route components:

```tsx
<Helmet title="contactUs" />
// document.title = trans("contactUs") + " | " + trans("appName")
```

### Opt-out per call

```tsx
<Helmet title="LiteralName" translatable={false} />
// document.title = "LiteralName" + " | " + trans(appName)  (if translateAppName is still on)
```

### Translation function not configured

If `translationFunction` is `undefined` but `translatable` is `true`, the title is written verbatim — no error, no warning.

## Where you set it

A common pattern: a `src/config/helmet.ts` module imported once from your app entry.

```ts
// src/config/helmet.ts
import { trans } from "@mongez/localization";
import { setHelmetConfigurations } from "@mongez/react-helmet";

setHelmetConfigurations({
  appName: "appName",
  appendAppName: true,
  appNameSeparator: " | ",
  translatable: true,
  translateAppName: true,
  translationFunction: trans,
});
```

```ts
// src/index.tsx (or app entry)
import "./config/helmet";
```

`setHelmetConfigurations` is a side-effecting module-level call; just importing the file once is enough.
