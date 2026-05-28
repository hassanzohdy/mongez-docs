---
title: "Recipes"
name: mongez-encryption-recipes
description: |
  Idiomatic composition patterns for `@mongez/encryption` — opaqued URL tokens, content-addressed cache keys, boot-time setup, switching driver, HMAC-layered integrity, throwaway one-shot keys, and distinguishing decrypt failure from a genuine `null` value.
sidebar:
  order: 99
---

Idiomatic compositions for `@mongez/encryption`. Pick the right tool for the threat first — read [`overview`](../overview/SKILL.md) if you haven't yet.

## Opaqued URL token

Wrap a value so it isn't human-readable in the URL bar or query log:

```ts
import AES from "crypto-js/aes";
import { encrypt, decrypt } from "@mongez/encryption";

const KEY = process.env.URL_TOKEN_KEY!;

function makeToken(payload: { orderId: number; exp: number }) {
  const cipher = encrypt(payload, KEY, AES);
  return encodeURIComponent(cipher);
}

function readToken(raw: string) {
  const payload = decrypt(decodeURIComponent(raw), KEY, AES);
  if (!payload) return null;                  // wrong key, garbage, or tamper
  if (payload.exp < Date.now()) return null;
  return payload;
}
```

**Threat model fit**: stops a casual user from reading and changing the token. Does NOT stop an attacker who specifically crafts ciphertext — there's no authentication. If forgery matters, use a signed JWT or layer HMAC (see below).

## Content-addressed cache key

```ts
import { sha256 } from "@mongez/encryption";

function cacheKey(query: unknown) {
  return `q:${sha256(JSON.stringify(query))}`;
}

const value = cache.get(cacheKey({ user: 42, scope: "orders" }));
```

Same input → same digest. Use this for deterministic cache keys, ETags, idempotency keys.

## Configured-once, used-everywhere

```ts
// src/setup/encryption.ts
import AES from "crypto-js/aes";
import { setEncryptionConfigurations } from "@mongez/encryption";

setEncryptionConfigurations({
  key: process.env.ENCRYPTION_KEY!,
  driver: AES,
});

// src/anywhere.ts
import { encrypt, decrypt } from "@mongez/encryption";

const c = encrypt({ a: 1 });   // no args needed
const v = decrypt(c);
```

Treat `setEncryptionConfigurations` as boot-time only. In a multi-tenant server pass the key explicitly per call instead.

## Switching driver

```ts
import TripleDES from "crypto-js/tripledes";
import { setEncryptionConfigurations, encrypt, decrypt } from "@mongez/encryption";

setEncryptionConfigurations({ driver: TripleDES });   // key still in place

encrypt("hello");                                     // now uses TripleDES
```

Prefer `AES`. TripleDES, Rabbit, RC4, RC4Drop are present in `crypto-js` but legacy.

## Adding integrity with HMAC

The package intentionally does NOT provide authenticated encryption. If your threat model requires it, layer HMAC explicitly:

```ts
import AES from "crypto-js/aes";
import HmacSHA256 from "crypto-js/hmac-sha256";
import { encrypt, decrypt } from "@mongez/encryption";

function seal(value: unknown, encKey: string, macKey: string) {
  const cipher = encrypt(value, encKey, AES);
  const tag = HmacSHA256(cipher, macKey).toString();
  return `${cipher}.${tag}`;
}

function open(sealed: string, encKey: string, macKey: string) {
  const dot = sealed.lastIndexOf(".");
  if (dot < 0) return null;
  const cipher = sealed.slice(0, dot);
  const tag = sealed.slice(dot + 1);
  const expected = HmacSHA256(cipher, macKey).toString();
  if (tag !== expected) return null;     // NOTE: not constant-time
  return decrypt(cipher, encKey, AES);
}
```

Caveats:

- The `tag !== expected` check is NOT constant-time. For a real production deployment, swap in a constant-time compare (Node `crypto.timingSafeEqual` after `Buffer.from(tag, "hex")`).
- `encKey` and `macKey` must be different keys. Don't reuse one secret for both.
- Encrypt-then-MAC ordering is what this snippet implements (verify the tag before decrypting). Don't flip it.

If you find yourself writing this much code around the package, you're past its threat model — reach for AES-GCM from Node `crypto` instead:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM is AEAD: confidentiality + integrity in one primitive.
// crypto-js does not provide GCM mode.
```

## Detecting "value was originally null" vs "decrypt failed"

`decrypt` returns `null` for both cases. If you need to distinguish them, wrap the value at encrypt time:

```ts
const cipher = encrypt({ value: maybeNull });        // explicit wrapper
const out = decrypt(cipher);
if (out === null) {
  // genuine decrypt failure — wrong key or tampered cipher
} else {
  const value = out.value;   // may legitimately be null
}
```

## Throwaway one-shot encryption

```ts
import AES from "crypto-js/aes";
import { encrypt, decrypt } from "@mongez/encryption";
import { randomBytes } from "node:crypto";

// Per-message random key (not "secure," just throwaway):
const key = randomBytes(32).toString("hex");
const c = encrypt({ secret: "tea" }, key, AES);
const v = decrypt(c, key, AES);
```

The key itself still needs to go somewhere if the recipient is to decrypt — this isn't asymmetric crypto. For "send key over channel A, message over channel B" you've left the package's territory; use Node `crypto` or libsodium with proper KDF and AEAD.
