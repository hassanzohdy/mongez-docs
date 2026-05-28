---
title: "Interactions"
name: mongez-dom-interactions
description: |
  Helpers for keyboard event detection, smooth scrolling, dark-mode detection, HTML-to-text conversion, and reading viewport/screen dimensions.
sidebar:
  order: 50
---

Helpers that touch user input or read environment state. Stateless, pure where possible.

## Keyboard

```ts
pressed(event: { keyCode?: number; charCode?: number }, key: number): boolean

const TAB_KEY = 9;
const ENTER_KEY = 13;
const CONTROL_KEY = 17;
const ESC_KEY = 27;
```

`pressed(event, key)` returns `true` when `event.keyCode || event.charCode` equals `key`.

```ts
import { pressed, ENTER_KEY, ESC_KEY } from "@mongez/dom";

input.addEventListener("keydown", e => {
  if (pressed(e, ENTER_KEY)) submit();
  else if (pressed(e, ESC_KEY)) cancel();
});
```

The constants are the readable equivalent of magic numbers in `event.keyCode`. Only four are exported — for anything else, supply the keycode yourself or migrate to `event.key`:

```ts
// Modern equivalent (recommended for new code):
if (e.key === "Enter") submit();
```

`pressed` exists for code that already reads `keyCode` (legacy code, code targeting older browsers, code that integrates with libraries using the same convention). For new code, prefer `event.key` — it's a string like `"Enter"` and works across keyboard layouts.

## Scrolling

```ts
scrollTo(querySelector: string): void
```

Calls `element.scrollIntoView({ behavior: "smooth" })` for the first matching element. No-op if nothing matches.

```ts
import { scrollTo } from "@mongez/dom";

scrollTo("#section-features");
scrollTo("[data-scroll-target]");
scrollTo(".active-tab");
```

Notes:

- Always smooth — there's no way to opt out without bypassing this helper.
- Only the first match is scrolled to. Subsequent matches are ignored.
- Passing a missing selector is safe (no throw, no console warning).
- Honors the `prefers-reduced-motion` media query at the user-agent level — browsers fall back to instant scroll when reduced motion is requested.

## Dark mode

```ts
userPrefersDarkMode(): boolean
```

Wraps `window.matchMedia("(prefers-color-scheme: dark)").matches`.

```ts
import { userPrefersDarkMode } from "@mongez/dom";

document.documentElement.classList.toggle("dark", userPrefersDarkMode());
```

To react to changes (the user flipping OS theme), subscribe to the media query directly:

```ts
const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", () => applyTheme());
```

## HTML → Text

```ts
htmlToText(html: string): string
```

Parses `html` into a throwaway `<div>` via `innerHTML` and returns its `textContent`. Strips all tags; decodes HTML entities; drops `<script>` and `<style>` content.

```ts
import { htmlToText } from "@mongez/dom";

htmlToText("<h1>Hello</h1>");                     // "Hello"
htmlToText("&amp; &lt;ok&gt;");                   // "& <ok>"
htmlToText("<p>One <strong>two</strong></p>");    // "One two"
```

Useful for plain-text previews of rich content, search excerpts, or computing character counts.

Note that `innerHTML` parses the string as HTML — it will not execute `<script>` tags (the browser blocks inline-script execution when set via `innerHTML`), but the function is still **not** a sanitizer. If you're displaying user input, use a real sanitizer (`DOMPurify`, server-side validation). `htmlToText` is for extracting visible text, not for safely rendering anything.

## Viewport dimensions

```ts
getWindowWidth(): number    // window.outerWidth
getWindowHeight(): number   // window.outerHeight
getScreenWidth(): number    // window.screen.width
getScreenHeight(): number   // window.screen.height
```

Thin one-line getters. Read live; don't cache.

```ts
import { getWindowWidth, getScreenWidth } from "@mongez/dom";

if (getScreenWidth() < 768) {
  // small device
}
```

Difference between the two pairs:

- **Window** measures the browser window's outer dimensions (the OS window frame).
- **Screen** measures the user's monitor.

For the inner viewport (what's actually visible to layout), use `window.innerWidth` / `window.innerHeight` directly — these aren't wrapped in this package.

## Example — keyboard shortcut table

```ts
import { pressed, ESC_KEY, ENTER_KEY, TAB_KEY } from "@mongez/dom";

const handlers: Record<number, () => void> = {
  [ENTER_KEY]: () => submit(),
  [ESC_KEY]:   () => cancel(),
  [TAB_KEY]:   () => focusNext(),
};

input.addEventListener("keydown", e => {
  for (const k of Object.keys(handlers)) {
    if (pressed(e, Number(k))) {
      e.preventDefault();
      handlers[Number(k)]();
      return;
    }
  }
});
```

## Example — smooth-scroll table of contents

```ts
import { scrollTo } from "@mongez/dom";

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    scrollTo(a.getAttribute("href")!);
  });
});
```
