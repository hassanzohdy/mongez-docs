---
title: "Encryption"
name: mongez-encryption-overview
description: |
  High-level overview of `@mongez/encryption` — what it wraps from `crypto-js`, its security boundaries, mental model, and failure modes.
  TRIGGER when: code first imports anything from `@mongez/encryption` (`encrypt`, `decrypt`, `md5`, `sha1`, `sha256`, `sha512`, `setEncryptionConfigurations`, `getEncryptionConfig`, `EncryptionConfigurations`); user asks "what does @mongez/encryption do", "is @mongez/encryption secure for X", "can I store passwords / tokens / PII with this", or "should I use this or Node `crypto`"; file evaluates whether to adopt the package or audits its threat model.
  SKIP: deep API reference on a specific export — use `mongez-encryption-encrypt-decrypt`, `mongez-encryption-hashes`, or `mongez-encryption-configuration`; ready-made composition patterns — use `mongez-encryption-recipes`; `@mongez/cache` encrypted entries — its own skill wraps this layer; questions strictly about `crypto-js` itself, libsodium, or Node `crypto`.
sidebar:
  order: 10
  label: "Overview"
---

`@mongez/encryption` is a thin convenience layer over [`crypto-js`](https://www.npmjs.com/package/crypto-js). It gives the rest of the Mongez family one consistent `encrypt(value, key)` / `decrypt(cipher, key)` pair so callers don't each re-invent the JSON wrapping, the UTF-8 decode step, and the "what does a wrong key look like" handling.

It is **not** a cryptography library. The helpers wrap exactly what `crypto-js` provides — they don't add authentication, modern KDFs, or constant-time comparisons.

## Install

```sh
yarn add @mongez/encryption
# runtime dep: crypto-js (declared as a dependency)
```

## Import pattern

```ts
import {
  encrypt,
  decrypt,
  md5,
  sha1,
  sha256,
  sha512,
  setEncryptionConfigurations,
  getEncryptionConfig,
  type EncryptionConfigurations,
} from "@mongez/encryption";
```

## Security boundaries — read this before reaching for the helpers

The single most important thing about this package: pick the right tool for the threat. The table below is the package's actual capability surface, not a marketing claim.

| Concern | This package |
|---|---|
| Authenticated encryption (AEAD / tamper detection) | **No.** `crypto-js` `AES.encrypt(text, passphrase)` is AES-CBC + OpenSSL-style MD5 KDF + random salt. Ciphertext can be tampered with undetectably. |
| Modern key derivation | **No.** OpenSSL-style KDF is one round of MD5. |
| Salts / IVs | crypto-js picks a fresh salt per call → cipher is non-deterministic. No IV exposed to caller. |
| Constant-time digest comparison | **No.** Outputs are hex strings; `===` is not timing-safe. |
| `md5` / `sha1` collision resistance | **Broken.** Suitable for fingerprinting / ETags only. |
| FIPS / regulated compliance | **No.** Pure-JS, not validated, uses primitives several regimes disallow. |

**Reach for it when**: opaquing query-string params, masking values in logs, signing-free local-storage payloads, non-sensitive round-trips through string form. Threat model: "casual reader," not "motivated attacker."

**Do NOT reach for it when**: passwords, session tokens, PII at rest, payment data, secrets in transit, anything under a compliance regime, anywhere you need integrity. Use Node `crypto` AES-GCM, libsodium, or a managed KMS.

## Mental model

| Concept | Type | Mental model |
|---|---|---|
| `encrypt(value, …)` | `(any, string?, driver?) => string` | JSON-stringify the value in a `{ data: value }` wrapper, hand to `driver.encrypt`, return base64 cipher. |
| `decrypt(cipher, …)` | `(string, string?, driver?) => any \| null` | Driver-decrypt, UTF-8-decode, JSON-parse, return `.data`. Returns `null` on any failure. |
| `driver` | a `crypto-js` cipher module | Anything with `.encrypt(text, key)` / `.decrypt(cipher, key)`. Default `AES`. |
| Hash function (`md5`, `sha1`, …) | `(string) => string` | Stateless — no config needed. Returns lowercase hex. |
| Module config | `{ key?, driver? }` | Module-level globals. Set once with `setEncryptionConfigurations` instead of threading args. |

## Scope boundaries

| Concern | Lives in | Why |
|---|---|---|
| AEAD / message auth / signed tokens | Node `crypto`, libsodium, JWE/JWS libs | This package intentionally does not provide it |
| Password hashing | `bcrypt` / `scrypt` / `argon2` | Hashes here are too fast and unsalted by default |
| KDF from passphrases | `crypto.scryptSync`, PBKDF2 (high cost), argon2 | Same reason |
| Random IDs / UUIDs | `crypto.randomUUID`, `nanoid` | Not crypto's job |
| Public-key crypto | Node `crypto`, libsodium | Same |

## Failure modes at a glance

| Input | `encrypt` | `decrypt` |
|---|---|---|
| Falsy / missing key | **Throws** `"Missing Encryption key…"` | **Throws** `"Missing Encryption key…"` |
| Circular reference | **Throws** at `JSON.stringify` | n/a |
| `undefined` value | Returns cipher of `"{}"` → decrypts to `undefined` | n/a |
| `function` value | Same as `undefined` | n/a |
| Wrong key | n/a | Returns `null` (cannot distinguish from tampered cipher) |
| Malformed / non-base64 cipher | n/a | Returns `null`; logs via `console.warn` |
| Empty string cipher | n/a | Returns `null` |
