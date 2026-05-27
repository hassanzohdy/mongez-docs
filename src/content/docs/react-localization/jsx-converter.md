---
title: "JSX converter"
name: mongez-react-localization-jsx-converter
description: |
  Deep reference for `jsxConverter` — its signature, splitter mechanics, missing-key behaviour, empty / null / primitive placeholder guard, double-curly pattern support, and React key assignment.
  TRIGGER when: code imports `jsxConverter` from `@mongez/react-localization`; code calls `setLocalizationConfigurations({ converter: jsxConverter })`; user asks "how do I render JSX inside trans()", "why does trans() return an array", or "how do placeholders work with React elements"; `import { jsxConverter } from "@mongez/react-localization"`.
  SKIP: `mongez-react-localization-trans-x` (per-call JSX without flipping global converter), `mongez-react-localization-overview` (package-level intro), `mongez-react-localization-recipes` (usage patterns); `@mongez/localization` is the framework-agnostic core that defines `trans`, `plainConverter`, and the placeholder pattern — this skill is the React-specific converter layer; react-i18next, react-intl, or other i18n libraries.
sidebar:
  order: 50
---

The placeholder-to-React converter. Drop into the localization config once, every `trans(...)` call gains JSX support.

## Signature

```ts
function jsxConverter(
  translation: string,
  placeholders: any,
  placeholderPattern: RegExp,
): string | React.ReactNode[];
```

## Wiring it globally

```ts
import { setLocalizationConfigurations } from "@mongez/localization";
import { jsxConverter } from "@mongez/react-localization";

setLocalizationConfigurations({
  defaultLocaleCode: "en",
  fallback: "en",
  converter: jsxConverter,
});
```

After this runs, `trans(...)` returns:

- a **string** when there are no placeholders or the placeholders bag is empty / a primitive,
- an **array of React fragments** when at least one placeholder is resolved.

## Splitter mechanics

The converter calls `translation.split(placeholderPattern)`. With a global RegExp containing a single capturing group (like the default `/:([a-zA-Z0-9_-]+)/g`), `split` interleaves literal segments and captured names:

```
"Create new :item for :who"
        |
        v
["Create new ", "item", " for ", "who", ""]
```

Even-indexed entries are literal text; odd-indexed entries are placeholder names. The converter maps each part to a `React.Fragment`, substituting `placeholders[name]` for odd entries.

## Missing-key behaviour

When a token appears in the template but is not present in `placeholders` (or its value is `null`/`undefined`), the rendered text is the **bare key**, with no leading colon. The leading `:` is gone because the splitter captured only the name.

```tsx
extend("en", { createItem: "Create new :item" });

transX("createItem", { wrongKey: "user" });
// → <Fragment>Create new </Fragment><Fragment>item</Fragment>
// → DOM text: "Create new item"
```

This is intentional fallback behaviour — pin it in your snapshots if you depend on it.

## Empty / primitive / null placeholders bag

Guard at the top of the function:

```ts
if (
  placeholders == null ||
  typeof placeholders !== "object" ||
  Object.keys(placeholders).length === 0
) {
  return translation; // plain string
}
```

So:

- `jsxConverter("Hello", 10, ...)` → `"Hello"` (string, no split)
- `jsxConverter("Hello", "x", ...)` → `"Hello"` (string)
- `jsxConverter("Hello", {}, ...)` → `"Hello"` (string)
- `jsxConverter("Hello", null, ...)` → `"Hello"` (string)
- `jsxConverter("Hello", undefined, ...)` → `"Hello"` (string)

This is how `trans("greeting")` and `trans("greeting", 10)` keep their string return type when the converter is wired globally. The `== null` check handles both `null` and `undefined` via loose equality before the `Object.keys(...)` call, so calling `jsxConverter` directly with a null / undefined bag is safe.

## Double-curly pattern

`@mongez/localization` supports `colon`, `doubleCurly`, or custom patterns:

```ts
setLocalizationConfigurations({
  placeholderPattern: "doubleCurly",
  converter: jsxConverter,
});

extend("en", { hi: "Hello {{name}}!" });

trans("hi", { name: <strong>Ada</strong> });
// → DOM: "Hello Ada!" with <strong>Ada</strong> in place.
```

`jsxConverter` doesn't hardcode a pattern — the pattern is supplied per call by `transFrom`, which reads it from the config.

## React keys

The converter assigns each fragment a numeric `key={index}`. With deterministic numeric keys derived from the split index, React doesn't emit "each child in a list should have a unique key" warnings, AND fragments don't reconcile across re-renders (they're recreated each time `trans` runs, which is fine because `React.Fragment` carries no DOM state).

## Direct invocation

You can call `jsxConverter` outside of `trans` if you have your own translation lookup:

```ts
import { jsxConverter } from "@mongez/react-localization";

const out = jsxConverter(
  "Welcome :name",
  { name: <strong>Ada</strong> },
  /:([a-zA-Z0-9_-]+)/g,
);
// out is an array of React.Fragments
```

Null, undefined, primitive, and empty-object placeholder bags are all handled by the guard at the top of the function — they short-circuit to the raw translation string.
