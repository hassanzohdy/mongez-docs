---
title: "Assets"
name: mongez-dom-assets
description: |
  Helpers for injecting external stylesheets, Google Fonts, local fonts via the `FontFace` API, third-party scripts, and reading/writing CSS custom properties on `:root` or any element.
sidebar:
  order: 50
---

Helpers for loading external resources and reading/writing CSS variables. All side-effecting; all browser-only.

## Stylesheets

```ts
styleSheet(href: string, id?: string | null): HTMLLinkElement
```

Appends or updates a `<link rel="stylesheet">`. When `id` is provided, looks up `document.getElementById(id)`; if found, only patches `href`. When the id isn't found (or omitted), creates a fresh link with `id="link-<random-7-digit-number>"`.

```ts
import { styleSheet } from "@mongez/dom";

// First call creates the link.
styleSheet("https://cdn.example.com/bootstrap.css", "ui-framework");

// Second call with the same id only updates href — no duplicate tag.
styleSheet("https://cdn.example.com/semantic.css", "ui-framework");
```

Use ids for any link you might want to swap later (theme switching, A/B framework swaps). Without an id you cannot find the link again.

## Fonts — `googleFont`

```ts
googleFont(href: string, id?: string | null): HTMLLinkElement
```

Wraps `styleSheet`. On the first call (per module lifetime) it also emits the two recommended `<link rel="preconnect">` tags:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
```

Subsequent calls skip the preconnect step.

```ts
import { googleFont } from "@mongez/dom";

googleFont("https://fonts.googleapis.com/css2?family=Inter:wght@400;700", "primary");
googleFont("https://fonts.googleapis.com/css2?family=Lora", "secondary");
```

## Fonts — `loadFont` (FontFace API)

```ts
loadFont(fontSettings: FontOptions): Promise<FontFace | FontFace[]>

type FontOptions = {
  name: string;
  src?: string;
  descriptors?: FontFaceDescriptors;
  weights?: FontWeightSetup[];
};

type FontWeightSetup = FontFaceDescriptors & {
  src?: string; woff?: string; woff2?: string; ttf?: string;
  eot?: string; svg?: string; otf?: string;
};
```

Two modes:

### Single file

```ts
import { loadFont } from "@mongez/dom";
import interWoff2 from "./fonts/inter.woff2";

await loadFont({ name: "Inter", src: interWoff2 });
// "Inter" is now registered in document.fonts.
```

### Multiple weights

```ts
await loadFont({
  name: "Inter",
  weights: [
    { weight: "light",  woff2: "./inter-300.woff2" },         // "light" -> "300"
    { weight: "normal", woff2: "./inter-400.woff2" },
    { weight: "bold",   woff2: "./inter-700.woff2" },
  ],
});
```

For each weight entry, all provided sources are concatenated into the `url(...) format("...")` shape that `FontFace` expects. `weight: "light"` is rewritten to `"300"` (the FontFace API doesn't accept the string `"light"`). Other `FontFaceDescriptors` (`style`, `display`, `unicodeRange`, …) pass through.

The returned promise resolves with the loaded `FontFace` (single mode) or array of `FontFace`s (weights mode). Each loaded face is also added to `document.fonts`.

## Scripts

```ts
loadScript(src: string, onLoad: () => void): HTMLScriptElement
```

Creates `<script src=...>`, wires `script.onload = onLoad`, appends to `<body>`, returns the element.

```ts
import { loadScript } from "@mongez/dom";

loadScript("https://example.com/analytics.js", () => {
  window.analytics.init("KEY");
});
```

If you need `async` or `defer`, patch the returned element:

```ts
const tag = loadScript("https://example.com/x.js", () => {});
tag.async = true;
```

Unlike `styleSheet`, there's no id-based reuse — each call appends a new `<script>` tag.

## CSS variables

```ts
cssVariable(name: string): string | void                                   // read from :root
cssVariable(name: string, value: string): void                             // write to :root

setCssVariable(name: string, value: string, element?: HTMLElement): void   // defaults to :root
getCssVariable(name: string, element?: HTMLElement): string                // defaults to :root
```

The single-function `cssVariable` is dual-purpose: omit `value` to read, supply `value` to write. Both branches target `:root` (i.e. `<html>`). For per-element scoping, use the explicit `setCssVariable` / `getCssVariable`.

```ts
import { cssVariable, setCssVariable, getCssVariable } from "@mongez/dom";

// Global theme
cssVariable("--color-primary", "#f00");
cssVariable("--color-primary");                        // "#f00"

// Per-element scope (component-level theming)
setCssVariable("--spacing", "16px", document.querySelector(".card")!);
getCssVariable("--spacing", document.querySelector(".card")!);  // "16px"
getCssVariable("--spacing");                                     // "" (not set on :root)
```

Reads always return a string — `""` when the variable isn't set on the given element. Writes are immediate; the next style recalculation picks them up.

## Example — dark-mode theming via CSS variables

```ts
import { cssVariable, userPrefersDarkMode } from "@mongez/dom";

function applyTheme() {
  const dark = userPrefersDarkMode();
  cssVariable("--color-bg",   dark ? "#0a0a0a" : "#ffffff");
  cssVariable("--color-fg",   dark ? "#ededed" : "#111111");
  cssVariable("--color-link", dark ? "#7cf"     : "#06c");
}

applyTheme();

// Live-react to OS theme changes:
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
```

## Gotchas

- **`styleSheet` and `googleFont` without an id create a new tag every call** with a random `link-<n>` id. Provide an id for anything you might want to update later.
- **`googleFont` emits the preconnect tags exactly once per module lifetime.** If the module is reloaded (HMR, test isolation), the flag resets. Outside of tests this is irrelevant.
- **`loadFont`'s `weight: "light"` → `"300"` mapping is silent.** Other named weights (`"normal"`, `"bold"`, …) pass through verbatim. The CSS Font Module Level 4 keywords aren't all valid for the FontFace API; if you're using anything other than `"normal" | "bold" | "light"`, use a numeric value like `"500"`.
- **`loadScript` doesn't dedupe.** Calling it twice with the same `src` appends two `<script>` tags. Track loaded scripts in your own caller if you need idempotence.
- **CSS variables are case-sensitive.** `cssVariable("--Color-Primary")` is different from `cssVariable("--color-primary")`.
