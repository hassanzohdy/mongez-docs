---
title: "transX"
name: mongez-react-localization-trans-x
description: |
  Reference for `transX()` — when to use it instead of `trans()`, what it delegates to (`transFrom` + `jsxConverter`), and what it does not do (subscriptions, per-call converter override, type coercion).
  TRIGGER when: code imports `transX` from `@mongez/react-localization`; code calls `transX(keyword, placeholders)` at a JSX call site; user asks "how is transX different from trans", "how do I use JSX placeholders without changing the global converter", or "how do I mix plain and JSX trans calls"; `import { transX } from "@mongez/react-localization"`.
  SKIP: `mongez-react-localization-jsx-converter` (converter mechanics and placeholder-bag guard), `mongez-react-localization-overview` (package-level intro and the two paths), `mongez-react-localization-recipes` (real-world locale-switching and `Translate` patterns); `@mongez/localization` exposes the underlying `trans`, `transFrom`, `plainTrans` — this skill is the React-bound variant; react-i18next, react-intl.
sidebar:
  order: 50
---

A `trans` variant pre-bound to `jsxConverter`. Use per call when the global converter is left as `plainConverter` and only specific call sites need JSX.

## Signature

```ts
function transX(keyword: string, placeholders?: any): string | React.ReactNode[];
```

## What it does

`transX` is **exactly** equivalent to:

```ts
import { getTranslationLocaleCode, transFrom } from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

transFrom(getTranslationLocaleCode(), keyword, placeholders, jsxConverter);
```

It hard-codes `jsxConverter` as the converter argument, ignoring `setLocalizationConfigurations({ converter })`. That's the entire point.

## When to use it

Default to `trans(...)` from `@mongez/localization`. Reach for `transX` only when:

1. The global converter is `plainConverter` (default), AND
2. This specific call site needs to interpolate a React element.

If `jsxConverter` is your global converter, `trans` and `transX` produce identical output — prefer `trans`.

## Example

```tsx
import { extend, trans, plainTrans } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  agreeToTerms: "By clicking, you agree to our :tos",
});

// Stays as plain string — global converter is plainConverter (default).
trans("agreeToTerms", { tos: "Terms" });
// → "By clicking, you agree to our Terms"

// Same call site, JSX placeholder via transX.
transX("agreeToTerms", { tos: <a href="/terms">Terms</a> });
// → React fragment array, rendered as a real <a> in the DOM.

// Force the plain converter even if the global one is jsxConverter.
plainTrans("agreeToTerms", { tos: "Terms" });
// → "By clicking, you agree to our Terms"
```

## What `transX` does NOT do

- **Does not subscribe to locale changes.** It's a plain function call — it reads `getTranslationLocaleCode()` once at call time and returns. A component that already rendered will keep its old translation until something re-renders it. See [`recipes`](../recipes/SKILL.md) for re-render patterns.
- **Does not respect a per-call converter argument.** The converter is `jsxConverter`, always. If you need a different converter, call `transFrom(...)` directly.
- **Does not coerce return types.** If placeholders is empty / primitive, you get a string back; otherwise you get an array of React fragments. Consumers must handle both.

## Inheritance from `transFrom`

Because `transX` delegates to `transFrom`, it inherits:

- Locale resolution via `getTranslationLocaleCode()` (which reads either the configured `translationLocalCode` or `getCurrentLocaleCode()`).
- Fallback locale handling (configured via `setFallbackLocaleCode`).
- Missing-keyword fallback (returns the keyword itself if nothing resolves).
- Count-based pluralization (when `placeholders.count` is set).
- Object-shaped keyword support (`trans({ en: "Hello", ar: "مرحبا" })`).

In other words, every feature of `@mongez/localization` works through `transX` exactly as it would through `trans` — only the converter is locked in.
