---
title: Get started with @mongez/react-atom
description: Install, the 30-second tour, and where to go next.
sidebar:
  order: 1
---

`@mongez/react-atom` is the React adapter for [`@mongez/atom`](/atom/getting-started/). Every atom carries React-aware hooks (`useValue`, `use(key)`, `useWatch`, `useState`) and a `<Provider>` component as instance methods. Subscriptions are wired through `useSyncExternalStore`, so reads stay tear-free under React 18 concurrent rendering.

## Install

```sh
yarn add @mongez/react-atom
# peer: react >= 18, @mongez/atom
```

## 30-second tour

```tsx
import { atom, openAtom, loadingAtom, fetchingAtom, portalAtom } from "@mongez/react-atom";

// 1. Suffix atom variables with "Atom" — avoids clashes with local names
const counterAtom = atom({ key: "counter", default: 0 });

// Preferred pattern: useValue() to read + atom methods to write
function Counter() {
  const count = counterAtom.useValue();
  return <button onClick={() => counterAtom.update(count + 1)}>{count}</button>;
}

// Or add a named action for clearer intent:
const counterAtom2 = atom({
  key: "counter2",
  default: 0,
  actions: { increment() { this.update(this.value + 1); } },
});

function Counter2() {
  const count = counterAtom2.useValue();
  return <button onClick={() => counterAtom2.increment()}>{count}</button>;
}

// 2. Preset atoms collapse common patterns
const sidebarAtom = openAtom("sidebar");
sidebarAtom.toggle();
const opened = sidebarAtom.useOpened();           // → boolean

const loginAtom = loadingAtom("loginPending");
loginAtom.startLoading();

const usersAtom = fetchingAtom<User[]>("users");
usersAtom.success(data);                          // sets isLoading=false, data
const isLoading = usersAtom.useLoading();
const users = usersAtom.useData();

// 3. Modals with payload
const editUserAtom = portalAtom<{ id: number; name: string }>("editUser");
editUserAtom.open({ id: 7, name: "Alice" });
const isOpen = editUserAtom.useOpened();
const payload = editUserAtom.useData();
```

## Where to go next

- [Overview](../overview/) — package pitch, install, what every atom hook does.
- [Atoms](../atoms/) — `atom(...)`, per-atom hooks, `atomCollection`, custom actions.
- [Preset atoms](../presets/) — `openAtom`, `loadingAtom`, `fetchingAtom`, `portalAtom`.
- [SSR & stores](../ssr/) — `<AtomStoreProvider>`, `useAtom`, hydration helpers.
- [Recipes](../recipes/) — toggles, modals, fetch lifecycles, Next.js / Remix / TanStack Start hydration.

## React version

React **18 or newer**. `useSyncExternalStore` is required. There are no plans to support 16/17; those users should stay on `@mongez/react-atom@5`.

## License

MIT.
