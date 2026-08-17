---
title: "Configuration"
name: mongez-encryption-configuration
description: |
  How to configure `@mongez/encryption` module-level defaults — `setEncryptionConfigurations`, `getEncryptionConfig`, `resetEncryptionConfigurations`, the PBKDF2 work factor, the opt-in legacy flags, and `clearKeyCache`.
sidebar:
  order: 17
---

`encrypt` and `decrypt` each take an optional key. To avoid threading it through every call site, set it once on the module.

## Signatures

```ts
type EncryptionConfigurations = {
  key?: string;
  iterations?: number;
  legacyDecryption?: boolean;
  legacyDriver?: LegacyCipherDriver;
  /** @deprecated v1.x pluggable cipher — now only nominates the legacy decrypt driver. */
  driver?: LegacyCipherDriver;
};

setEncryptionConfigurations(opts: EncryptionConfigurations): void
getEncryptionConfig(key: keyof EncryptionConfigurations): any
resetEncryptionConfigurations(): void
assertIterations(iterations: number): void   // throws EncryptionError if out of range
```

## Defaults at import time

```ts
{ key: null, iterations: 210_000, legacyDecryption: false, legacyDriver: AES }
```

So in the common case you only set `key`.

| Option | Effect |
|---|---|
| `key` | Default passphrase for `encrypt`/`decrypt`/`tryDecrypt`. It is stretched with PBKDF2 — which does not rescue a short key. Use a long, high-entropy secret. |
| `iterations` | PBKDF2 work factor used **when encrypting**. Must be an integer in `100_000 … 5_000_000`; anything else throws `EncryptionError` at configuration time. |
| `legacyDecryption` | Allow `decrypt` to fall back to the v1.x AES-CBC format. **Off by default** — that format is unauthenticated, and silently accepting it forever would let an attacker who can write to your storage swap an authenticated envelope for a malleable legacy blob. Turn it on only while migrating. |
| `legacyDriver` | Cipher used for that fallback. Defaults to crypto-js `AES`, which is what v1.x defaulted to. Only matters if v1 wrote your data with something else (e.g. `TripleDES`). |
| `driver` | **Deprecated.** v1.x's pluggable cipher. It cannot influence encryption any more — v2 always uses AES-256-GCM — so it is re-pointed at the legacy decrypt path and logs one deprecation warning per process. Prefer `legacyDriver`. |

## Merge semantics

`setEncryptionConfigurations` shallow-merges over the current state, so partial updates keep everything else:

```ts
setEncryptionConfigurations({ key: "k1" });              // iterations / legacy defaults kept
setEncryptionConfigurations({ legacyDecryption: true }); // key preserved
setEncryptionConfigurations({ key: undefined });         // erases the key
```

`undefined` values ARE written through — a property of the shallow merge, not a quirk to rely on.

`resetEncryptionConfigurations()` restores the import-time defaults; useful in test setup.

## Reading the config

```ts
getEncryptionConfig("key");              // current default passphrase (or null)
getEncryptionConfig("iterations");       // 210000
getEncryptionConfig("legacyDecryption"); // false
```

Returns `any` — `legacyDriver` is "any cipher module".

## The work factor

The count in force at encryption time is **written into the envelope**, so raising it later does not orphan older ciphertexts: they decrypt at whatever count sealed them, and the next `encrypt` uses the new value.

```ts
setEncryptionConfigurations({ iterations: 600_000 }); // globally
await encrypt(value, key, { iterations: 100_000 });   // per call
```

Validation is asymmetric, deliberately:

- **Encrypting / configuring** — an integer in `100_000 … 5_000_000`. Below the floor, PBKDF2 is decorative.
- **Decrypting** — `1 … 5_000_000`. That number is read out of attacker-reachable ciphertext: low values are accepted so old envelopes stay readable, and the hard ceiling stops a forged header claiming four billion iterations from pinning a CPU core before the tag check ever runs.

Raising `iterations` costs latency on every distinct (key, salt) pair — measure before pushing it far past the default.

## Per-call overrides

```ts
import { setEncryptionConfigurations, encrypt } from "@mongez/encryption";

setEncryptionConfigurations({ key: "global" });

await encrypt("hello");                              // configured key, 210k iterations
await encrypt("hello", "specific");                  // per-call key
await encrypt("hello", "specific", { iterations: 300_000 });
```

The fallback resolves at call time: changing the config later affects subsequent calls but not existing ciphertext, which carries its own salt and work factor.

## Multi-tenant servers — prefer explicit per-call keys

The configuration is process-global. Two concurrent requests with different tenant keys would race:

```ts
// DON'T do this in a request handler:
setEncryptionConfigurations({ key: req.user.tenantKey });
return encrypt(payload);

// DO this instead:
return encrypt(payload, req.user.tenantKey);
```

Treat `setEncryptionConfigurations` as boot-time setup, never request-time state.

## The derived-key cache

Derived keys are memoised in-process by `(passphrase, salt, iterations)` — up to 64 entries, non-extractable — because PBKDF2 costs ~100 ms a call. Clear it when a session or a key ends:

```ts
import { clearKeyCache } from "@mongez/encryption";

clearKeyCache(); // on logout, on key rotation, between tests
```

## Example: boot-time setup

```ts
// src/setup/encryption.ts
import { setEncryptionConfigurations } from "@mongez/encryption";

const key = process.env.ENCRYPTION_KEY;

if (!key || key.length < 32) {
  throw new Error("ENCRYPTION_KEY is required and must be at least 32 chars");
}

setEncryptionConfigurations({ key });
```

Import this once at process start, then call `encrypt`/`decrypt` without a key anywhere in the app. Crash loudly here rather than falling through to the throw inside `encrypt`, which would surface at some random call site later.

## Example: test setup

```ts
import { afterEach, beforeEach } from "vitest";
import {
  clearKeyCache,
  MIN_ITERATIONS,
  resetEncryptionConfigurations,
  setEncryptionConfigurations,
} from "@mongez/encryption";

beforeEach(() => {
  resetEncryptionConfigurations();
  // The work factor is a number in the envelope, not a behavioural switch —
  // running at the floor keeps a suite fast without changing what's tested.
  setEncryptionConfigurations({ key: "a-long-test-passphrase", iterations: MIN_ITERATIONS });
});

afterEach(() => {
  resetEncryptionConfigurations();
  clearKeyCache();
});
```

Use a test environment that exposes WebCrypto (Vitest/Jest `node`, or a jsdom with `crypto.subtle` injected), and never assert on an exact ciphertext — it changes every call.
