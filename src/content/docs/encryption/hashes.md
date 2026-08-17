---
title: "Hashes"
name: mongez-encryption-hashes
description: |
  Reference for the `md5`, `sha1`, `sha256`, and `sha512` hash functions exported by `@mongez/encryption` — lowercase hex digests via `crypto-js`, synchronous and unchanged in v2.
sidebar:
  order: 50
---

Four hex-encoded digests: `md5`, `sha1`, `sha256`, `sha512`. All four take a string and return a lowercase hex string.

**Unchanged in v2.** They are still synchronous, still need no configuration, and — unlike `encrypt`/`decrypt` — need no WebCrypto, so they work in any runtime. If hashes are all you import from this package, the 2.0 upgrade is a no-op for you.

## Signatures

```ts
md5(text: string):    string  // @deprecated — legacy interop only
sha1(text: string):   string  // @deprecated — legacy interop only
sha256(text: string): string
sha512(text: string): string
```

Direct passthroughs to `CryptoJS.MD5/SHA1/SHA256/SHA512` with `.toString()`.

`md5` and `sha1` now carry `@deprecated` JSDoc so an editor strikes them through at the call site. They still work and are not being removed — they exist for legacy interop (old cache keys, gravatar-style identifiers). Do not add new uses; default to `sha256`.

## Test vectors

```ts
md5("")          // "d41d8cd98f00b204e9800998ecf8427e"
md5("123456")    // "e10adc3949ba59abbe56e057f20f883e"
sha1("")         // "da39a3ee5e6b4b0d3255bfef95601890afd80709"
sha1("123456")   // "7c4a8d09ca3762af61e59520943dc26494f8941b"
sha256("")       // "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
sha256("123456") // "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
sha512("123456") // "ba3253876aed6bc22d4a6ff53d8406c6ad864195ed144ab5c87621b6c233b548baeae6956df346ec8c17f5ea10f35ee3cbc514797ed7ddd3145464e2a0bab413"
```

Unicode is encoded as UTF-8 before hashing — outputs match the standard test vectors for that scheme.

## Suitable uses

- **Content fingerprints** — dedup of static assets, build-output integrity (when the threat is wire corruption, not an active attacker).
- **ETag-style cache keys** — `sha256(JSON.stringify(query))` makes a stable key for a complex input.
- **Idempotency keys** — `sha256(payload)` collapses retries into one operation.
- **Bloom filter / probabilistic structure inputs.**

Hash for keys; encrypt for secrecy. Never use a ciphertext as a cache key — `encrypt` is non-deterministic, so it changes on every call.

## Unsuitable uses (use the right tool instead)

| Use case | Why hashes here don't fit | What to use |
|---|---|---|
| Password storage | Too fast; no per-record salt; GPU-brute-forceable | `bcrypt`, `scrypt`, **Argon2id** |
| Message authentication | A plain hash binds no secret | HMAC — `crypto-js/hmac-sha256`, or `crypto.subtle.sign` with HMAC |
| Tamper detection on a payload you also encrypt | Redundant — `encrypt` already authenticates | `encrypt`/`decrypt` from this package (AES-256-GCM) |
| Signatures over attacker-controlled input | `md5` / `sha1` are not collision-resistant | `sha256` + RSA-PSS / Ed25519, or a JWS library |
| Constant-time equality of secrets | `===` on hex leaks length and timing | `crypto.timingSafeEqual` (Node) |
| FIPS / regulatory validation | Pure JS, unvalidated | A vetted library or a KMS |

## md5 and sha1 are broken — what does that mean?

Both have practical collision attacks:

- An attacker who controls part of the input can construct two messages with the same digest.
- **For signatures and integrity over adversarial input, that is fatal.**
- For non-adversarial fingerprinting — ETags, deduplicating files you produced yourself, hashing keys into a fixed namespace — it is not: collisions do not appear by chance.

Default to `sha256` when unsure. 32 bytes (64 hex chars), fast enough outside a tight loop.

## Example: a deterministic cache key

```ts
import { sha256 } from "@mongez/encryption";

function cacheKey(query: unknown) {
  // Property order can vary across engines — sort keys for a truly canonical
  // form if the input is built dynamically.
  return `q:${sha256(JSON.stringify(query))}`;
}
```

Same input → same digest, every time.

## Example: HMAC outside this package

The package does not export HMAC. If you need message authentication over data you are *not* encrypting, use one:

```ts
import HmacSHA256 from "crypto-js/hmac-sha256";

const tag = HmacSHA256("the message", "the key").toString();
```

Compare tags in constant time, not with `===`. If you are encrypting the data anyway, you do not need a separate MAC — `encrypt` is AES-256-GCM and already authenticates the ciphertext and its header.
