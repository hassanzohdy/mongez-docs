---
title: "Encrypt Decrypt"
name: mongez-encryption-encrypt-decrypt
description: |
  Detailed reference for the `encrypt` and `decrypt` functions — signatures, the `{ data: value }` JSON wrapper, failure modes, and non-deterministic ciphertext semantics.
  TRIGGER when: code imports `encrypt` or `decrypt` from `@mongez/encryption`; user asks "how do I encrypt/decrypt a value", "why does decrypt return null", "how do I round-trip a token through a URL", or "why are two encryptions of the same input different"; file constructs opaque tokens, masks values in logs, or swaps the `crypto-js` driver (AES, TripleDES).
  SKIP: hashing/fingerprinting — use `mongez-encryption-hashes`; configuring module-level defaults — use `mongez-encryption-configuration`; recipe-style compositions (URL token, HMAC layering) — use `mongez-encryption-recipes`; authenticated encryption / AEAD (use Node `crypto` AES-GCM, libsodium, or JWE); password storage (use `bcrypt`/`scrypt`/`argon2`); `@mongez/cache` encrypted entries (its own skill).
sidebar:
  order: 50
---

The two flagship functions: `encrypt(value, key?, driver?)` and `decrypt(cipher, key?, driver?)`.

## Signatures

```ts
encrypt(value: any, key?: string, driver?: any): string
decrypt(cipher: string, key?: string, driver?: any): any | null
```

- `key` defaults to the configured default from `setEncryptionConfigurations({ key })`. Throws if neither is set.
- `driver` defaults to the configured driver; the import-time default is `AES` from `crypto-js`. Any module with `.encrypt(text, key)` / `.decrypt(cipher, key)` works.

## Round-trip semantics

```ts
import AES from "crypto-js/aes";
import { encrypt, decrypt } from "@mongez/encryption";

const cipher = encrypt({ userId: 42 }, "my-key", AES);
const value  = decrypt(cipher, "my-key", AES);
// value === { userId: 42 }
```

The pair is reversible for any JSON-encodable value: primitives, arrays, plain objects, nested combinations.

## How encrypt works (internals)

1. Wraps the input as `{ data: value }`. The wrapper is what makes primitives like `0`, `false`, and `null` survive — `JSON.stringify(null)` is `"null"` and round-trips fine, but the wrapper also forces a consistent shape `decrypt` can rely on.
2. `JSON.stringify`s the wrapper.
3. Calls `driver.encrypt(plaintext, key)` and returns `.toString()` on the result — a base64 string with the OpenSSL `Salted__` prefix when using AES with a passphrase key.

```ts
// Effectively:
function encrypt(value, key, driver) {
  if (!key) throw new Error("Missing Encryption key, …");
  return driver.encrypt(JSON.stringify({ data: value }), key).toString();
}
```

## How decrypt works (internals)

1. Calls `driver.decrypt(cipher, key)` and decodes the bytes to UTF-8 (`.toString(CryptoJS.enc.Utf8)`).
2. If the decoded plaintext is empty (wrong key, garbage input), returns `null`.
3. `JSON.parse`s the plaintext and returns `.data`.
4. Catches any thrown error, logs via `console.warn`, returns `null`.

```ts
// Effectively:
function decrypt(cipher, key, driver) {
  if (!key) throw new Error("Missing Encryption key, …");
  try {
    const text = driver.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text).data;
  } catch (e) {
    console.warn(e);
    return null;
  }
}
```

## Failure modes

| Situation | Behavior |
|---|---|
| Wrong key | `decrypt` returns `null`. **Cannot be distinguished** from tampered cipher or malformed input — the wrapper has no authentication. |
| Tampered cipher | Either `null` (corrupted bytes) or — if the tamper is "clever" — silently returns whatever the corrupted bytes happen to parse into. There is no MAC to check. |
| Empty / non-base64 cipher | `decrypt` returns `null`. A `console.warn` is emitted. |
| Falsy key (per-call and config) | `encrypt` / `decrypt` throw `"Missing Encryption key, please define it or set it in encryption configurations"`. |
| Circular reference in `value` | `encrypt` throws synchronously from `JSON.stringify` before any cipher work happens. |
| `undefined` value | Round-trips as `undefined`. (`JSON.stringify({ data: undefined })` is `"{}"`; `JSON.parse("{}").data` is `undefined`.) |
| `function` value | Same as `undefined` — functions are dropped at JSON time. |

## Non-determinism

```ts
encrypt("hello", "k", AES) === encrypt("hello", "k", AES);
// false — crypto-js picks a fresh salt each call
```

Both ciphers decrypt to `"hello"`. **Do not compare ciphertexts for equality.** If you need a stable token for the same input, hash it (`sha256`) and use that as the key.

## Examples

### Wrapping a token

```ts
import AES from "crypto-js/aes";
import { encrypt, decrypt } from "@mongez/encryption";

const token = encrypt({ orderId: 4242, exp: Date.now() + 3600_000 }, KEY, AES);
const url = `/orders?t=${encodeURIComponent(token)}`;

// Server side:
const claims = decrypt(decodeURIComponent(t), KEY, AES);
if (!claims) throw new Error("invalid or expired token");
```

This is fine for obfuscation. If your security model says "an attacker must not be able to forge claims," this is the wrong tool — there is no signature to verify. Use a signed JWT.

### Switching driver

```ts
import TripleDES from "crypto-js/tripledes";
import { encrypt, decrypt } from "@mongez/encryption";

const c = encrypt("hello", "k", TripleDES);
const v = decrypt(c, "k", TripleDES);  // "hello"
```

### Detecting decryption failure

```ts
const v = decrypt(maybeCipher, key, AES);
if (v === null) {
  // wrong key, bad input, or tamper — they're indistinguishable here
  return badRequest();
}
```

Note that `v === null` is also a legitimate round-trip when the original value was `null`. If you need to distinguish those, encode a non-null sentinel: `encrypt({ value: x })` and check `result?.value`.
