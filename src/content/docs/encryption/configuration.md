---
title: "Configuration"
name: mongez-encryption-configuration
description: |
  How to configure `@mongez/encryption` module-level defaults using `setEncryptionConfigurations` and `getEncryptionConfig`.
sidebar:
  order: 50
---

`encrypt` and `decrypt` each take an optional `key` and `driver`. To avoid threading them through every call site, set them once on the module.

## Signatures

```ts
type EncryptionConfigurations = {
  key?: string;
  driver?: any;   // any crypto-js cipher module
};

setEncryptionConfigurations(opts: EncryptionConfigurations): void
getEncryptionConfig(key: keyof EncryptionConfigurations): any
```

## Defaults at import time

```ts
{ key: null, driver: AES }
```

So you only have to set `key` if you're happy with AES. The `driver` slot pre-imports `crypto-js/aes`, which means importing `@mongez/encryption` also pulls in the AES module — that's the only non-tree-shakeable bit of the package.

## Merge semantics

`setEncryptionConfigurations` shallow-merges over the current state:

```ts
setEncryptionConfigurations({ key: "k1" });          // { key: "k1", driver: AES }
setEncryptionConfigurations({ driver: TripleDES });  // { key: "k1", driver: TripleDES }
setEncryptionConfigurations({ key: undefined });     // { key: undefined, driver: TripleDES }
```

`undefined` keys ARE written through; if you pass `{ key: undefined }` you erase any previous key. (This is a property of the shallow merge, not a quirk to rely on.)

## Reading the config

```ts
getEncryptionConfig("key");      // current default key
getEncryptionConfig("driver");   // current default driver
```

Returns `any` — typed as such because `driver` is "any cipher module."

## Per-call overrides

```ts
import AES from "crypto-js/aes";
import { setEncryptionConfigurations, encrypt } from "@mongez/encryption";

setEncryptionConfigurations({ key: "global", driver: AES });

encrypt("hello");                          // uses "global", AES
encrypt("hello", "specific");              // uses "specific", AES (driver falls back to config)
encrypt("hello", "specific", TripleDES);   // uses "specific", TripleDES
```

The fallback resolves at call time: changing the config later affects subsequent calls but not previously-encrypted ciphers (the cipher itself doesn't carry the key, by design — only the algorithm output bytes).

## Multi-tenant servers — prefer explicit per-call

The configuration is process-global. Two concurrent requests with different per-tenant keys would race:

```ts
// DON'T do this in a request handler:
setEncryptionConfigurations({ key: req.user.tenantKey });
return encrypt(payload);

// DO this instead:
return encrypt(payload, req.user.tenantKey, AES);
```

Treat `setEncryptionConfigurations` as boot-time setup, not request-time state.

## Example: boot-time setup

```ts
// src/setup/encryption.ts
import AES from "crypto-js/aes";
import { setEncryptionConfigurations } from "@mongez/encryption";

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is required");
}

setEncryptionConfigurations({
  key: process.env.ENCRYPTION_KEY,
  driver: AES,
});
```

Import this once at process start, then call `encrypt` / `decrypt` without arguments from anywhere in the app.
