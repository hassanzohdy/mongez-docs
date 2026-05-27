---
title: "Recipes"
name: mongez-react-localization-recipes
description: |
  Real-world usage patterns for `@mongez/react-localization` — JSX inside translated sentences, pluralization, locale switching via state or atoms, a custom `useLocale` hook, a `Translate` component, and mixing converters per call site.
  TRIGGER when: code uses `transX`, `jsxConverter`, `setCurrentLocaleCode`, `localizationEvents`, or `useSyncExternalStore` for locale switching; user asks "how do I render a link inside a translated sentence", "how do I re-render on locale change", "how do I build a useLocale hook", "how do I make a Translate component", or "how do I do pluralization with JSX"; `import { transX } from "@mongez/react-localization"` alongside `extend`/`setCurrentLocaleCode` from `@mongez/localization`.
  SKIP: `mongez-react-localization-jsx-converter` (converter internals), `mongez-react-localization-trans-x` (the bare function reference), `mongez-react-localization-overview` (install/intro); `@mongez/localization` is the framework-agnostic core for registry and count rules; `@mongez/react-atom` for atom-driven state — referenced here but its own skill set covers atom internals; react-i18next, react-intl.
sidebar:
  order: 99
---

Real-world flows for `@mongez/react-localization`. Every recipe assumes you've also installed `@mongez/localization` (the core).

## JSX inside a translated sentence

The single most common use case: dropping a link / icon / styled span into a localized sentence without breaking translation structure.

```tsx
import { extend } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  agreeToTerms:
    "By clicking Continue, you agree to our :tos and :privacy.",
});

function CheckoutFooter() {
  return (
    <p>
      {transX("agreeToTerms", {
        tos: <a href="/terms">Terms of Service</a>,
        privacy: <a href="/privacy">Privacy Policy</a>,
      })}
    </p>
  );
}
```

The result is a fragment array; React renders each fragment in document order, preserving the original sentence structure of the translation — including in RTL locales.

## Pluralization (delegated to `@mongez/localization`)

Count-based variants are handled by the core package. `transX` flows the `count` placeholder through.

```ts
import { extend } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

extend("en", {
  products_zero: "No products",
  products_one: "1 product",
  products_many: ":count products",
});

extend("ar", {
  products_zero: "لا توجد منتجات",
  products_one: "منتج واحد",
  products_two: "منتجان",
  products_few: ":count منتجات",
  products_many: ":count منتجاً",
});

transX("products", { count: 0 });   // "No products" (as fragment array)
transX("products", { count: 1 });   // "1 product"
transX("products", { count: 42 });  // "42 products"
```

When `count` is in the placeholders bag, the converter runs even for templates with no `:count` token (like `_one` → `"1 product"`), so you always get an array back. Wrap in `<>{...}</>` or render into an element — don't pass it to `string`-typed APIs.

## Locale switch via component state

Simplest re-render path. Lift the locale into local state, mirror to the core in an effect.

```tsx
import { useEffect, useState } from "react";
import { setCurrentLocaleCode } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

function App() {
  const [locale, setLocale] = useState<"en" | "ar">("en");

  useEffect(() => {
    setCurrentLocaleCode(locale);
  }, [locale]);

  return (
    <>
      <button onClick={() => setLocale(l => (l === "en" ? "ar" : "en"))}>
        {transX("toggleLocale")}
      </button>
      {/* `key` forces children to remount on switch */}
      <Page key={locale} />
    </>
  );
}
```

The `key={locale}` trick is the cheapest way to re-render every consumer when the locale flips — at the cost of unmounting and remounting the subtree. For surgical re-renders, use an atom or a custom hook.

## Locale switch via `@mongez/react-atom`

Atom-driven re-renders without the remount.

```tsx
import { atom } from "@mongez/react-atom";
import { setCurrentLocaleCode } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

const localeAtom = atom({ key: "ui.locale", default: "en" });

// Mirror the atom into the core package's state.
localeAtom.onChange((next) => setCurrentLocaleCode(next));

function LocaleSwitch() {
  const [locale, setLocale] = localeAtom.useState();
  return (
    <button onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
      {transX("toggleLocale")}
    </button>
  );
}

function Greeting() {
  localeAtom.useValue(); // subscribes; drives re-render on flip
  return <h1>{transX("greeting")}</h1>;
}
```

`localeAtom.useValue()` does the work — the return value is unused, but the subscription it creates re-renders the component when the locale changes. Cleaner than `key=`-based remounts.

## Custom `useLocale()` over the event bus

If you don't want a new dependency, you can wire your own hook over `localizationEvents`. **Use `useSyncExternalStore`** — the `useState + useEffect(localizationEvents.onChange)` shape has a tearing-style stale-read window between the render snapshot and the effect-time subscription.

```ts
import { useSyncExternalStore } from "react";
import {
  getCurrentLocaleCode,
  localizationEvents,
} from "@mongez/localization";

export function useLocale(): string {
  return useSyncExternalStore(
    (notify) => {
      const sub = localizationEvents.onChange("localeCode", notify);
      return () => sub.unsubscribe();
    },
    () => getCurrentLocaleCode(),
    () => getCurrentLocaleCode(),
  );
}
```

Now any component can:

```tsx
function Title() {
  useLocale(); // subscribes; re-renders on flip
  return <h1>{transX("title")}</h1>;
}
```

This is the recipe `@mongez/react-localization` itself **would** ship if it grew a hooks surface. If you build it, prefer `useSyncExternalStore` over the older `useState + useEffect` shape.

## A tiny `<Translate>` component

Some teams prefer a JSX-in / JSX-out shape. Trivial to write:

```tsx
import { transX } from "@mongez/react-localization";

type TranslateProps = {
  k: string;
  placeholders?: any;
};

export function Translate({ k, placeholders }: TranslateProps) {
  return <>{transX(k, placeholders)}</>;
}

// Usage:
<Translate k="welcome" placeholders={{ name: <strong>Ada</strong> }} />
```

The function-call shape (`{transX(k, p)}`) composes more cleanly with `transObject` and conditionals — that's why the package doesn't ship the component by default — but the wrapper is a one-liner if your codebase prefers it.

## Mixing converters per call site

Suppose your app is 90% plain text and 10% JSX. Wire `plainConverter` (the default) globally, then upgrade specific call sites to JSX:

```tsx
import { trans, plainTrans } from "@mongez/localization";
import { transX } from "@mongez/react-localization";

trans("greeting");                                // plain string
plainTrans("greeting", { name: "Ada" });          // forced plain string
transX("greeting", { name: <em>Ada</em> });       // JSX fragment array
```

The TypeScript signatures stay narrow at most call sites (you get `string`), and only the JSX call sites widen to `string | React.ReactNode[]`.
