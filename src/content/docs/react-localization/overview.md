---
title: "React Localization"
name: mongez-react-localization-overview
description: |
  Package overview for `@mongez/react-localization` — what it exports, how it relates to `@mongez/localization`, and when to use each of its two exports.
  TRIGGER when: code imports `jsxConverter` or `transX` from `@mongez/react-localization`; user asks "what does @mongez/react-localization do", "how do I install @mongez/react-localization", "should I use jsxConverter or transX", or "what's the difference between this and @mongez/localization"; `import { jsxConverter, transX } from "@mongez/react-localization"`.
  SKIP: `mongez-react-localization-jsx-converter` (deep dive on converter mechanics), `mongez-react-localization-trans-x` (per-call JSX function), `mongez-react-localization-recipes` (real-world patterns); `@mongez/localization` is the framework-agnostic core (registry, locale switching, count rules) — this skill is the React adapter layer; react-i18next, react-intl, FormatJS.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/react-localization` is the React-side bridge for `@mongez/localization`. It does **one thing**: replace `:placeholder` (or `{{placeholder}}`) tokens in a translation with React children, so you can drop `<strong>`, `<a href>`, or any element straight into a translated sentence.

The package is small on purpose. Two exports:

- `jsxConverter` — the placeholder-to-React converter. Plug into `setLocalizationConfigurations({ converter: jsxConverter })`.
- `transX` — a `trans` variant pre-bound to `jsxConverter`. Use per call when you don't want to flip the global converter.

## Install

```sh
yarn add @mongez/react-localization
# peer: @mongez/localization, react >= 18
```

## Import pattern

```ts
import { jsxConverter, transX } from "@mongez/react-localization";
```

Everything else — `extend`, `trans`, `setCurrentLocaleCode`, `groupedTranslations`, `transObject`, `localizationEvents`, count rules — comes from `@mongez/localization`.

## The two paths

### Path A: wire `jsxConverter` globally

```ts
import { setLocalizationConfigurations } from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

setLocalizationConfigurations({
  defaultLocaleCode: "en",
  fallback: "en",
  converter: jsxConverter,
});
```

Now every `trans(...)` understands JSX placeholders. The return type widens to `string | React.ReactNode[]` (the converter returns an array when at least one placeholder is found).

### Path B: keep the default converter, use `transX` per call

```ts
import { trans, plainTrans } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

trans("greeting");                              // → "Hello" (string)
trans("greeting", { name: "Alice" });           // → "Hello Alice" (string)
transX("greeting", { name: <em>Alice</em> });   // → React fragment array
```

This path keeps `trans` strongly typed as `string` for the 99% of call sites that don't need JSX.

## What this package is NOT

- **Not a hooks library.** No `useLocale`, no `useTranslate`, no `<Translate>`. `transX` is a plain function call.
- **Not a subscription layer.** `setCurrentLocaleCode("ar")` does NOT re-render components that already rendered. Drive the re-render from a parent (state, atom, event).
- **Not a registry.** Translations live in `@mongez/localization`'s module-level state. Call `extend("en", {...})` from the core package.

## Scope boundaries

| Concern | Lives where |
|---|---|
| Translation registry, locale switching, count rules | `@mongez/localization` |
| JSX placeholder support | `@mongez/react-localization` (this package) |
| State management / locale-driven re-renders | `@mongez/react-atom` or your own state library |
| Event bus | `@mongez/events` |

## React version

React 18+ for the peer dep. Only `React.Fragment` is used internally; the floor is set by the rest of the `@mongez/*` family.
