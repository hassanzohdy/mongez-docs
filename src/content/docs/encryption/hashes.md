---
title: "Hashes"
name: mongez-encryption-hashes
description: |
  Reference for the `md5`, `sha1`, `sha256`, and `sha512` hash functions exported by `@mongez/encryption` — lowercase hex digests via `crypto-js`.
sidebar:
  order: 50
---

Four hex-encoded digests: `md5`, `sha1`, `sha256`, `sha512`. All four take a string and return a lowercase hex string.

## Signatures

```ts
md5(text: string):    string
sha1(text: string):   string
sha256(text: string): string
sha512(text: string): string
```

All four are stateless — no configuration, no module setup. They are direct passthroughs to `CryptoJS.MD5/SHA1/SHA256/SHA512` with `.toString()`.

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

- **Content fingerprints** — dedup of static assets, build-output integrity (when the threat is "wire corruption," not "active attacker").
- **ETag-style cache keys** — `sha256(JSON.stringify(query))` makes a stable cache key for a complex input.
- **Idempotency keys** — `sha256(payload)` derives a stable key from a request body so retries collapse into one operation.
- **Bloom filter / probabilistic structure inputs.**

## Unsuitable uses (use the right tool instead)

| Use case | Why hashes here don't fit | What to use |
|---|---|---|
| Password storage | Too fast; lack per-record salt; vulnerable to GPU brute force | `bcrypt`, `scrypt`, `argon2` |
| Message authentication | Plain hashes don't bind a secret | HMAC — `CryptoJS.HmacSHA256(message, key).toString()`, or Node `crypto.createHmac` |
| Digital signatures over attacker-controlled inputs | `md5` and `sha1` are not collision-resistant | `sha256` + a signing primitive (RSA-PSS, Ed25519), or a JWS library |
| Constant-time equality of secrets | `===` on hex strings leaks length / timing | `crypto.timingSafeEqual` (Node) |
| Anything requiring FIPS or regulatory validation | Pure-JS, unvalidated | A vetted library / KMS |

## md5 and sha1 are broken — what does that mean?

Both algorithms have practical collision attacks. That means:

- An attacker who controls part of the input can construct two messages with the same digest.
- **For signatures and integrity over adversarial inputs, this is fatal.**
- For non-adversarial fingerprinting (ETags, deduplicating files you produced yourself, hashing arbitrary keys into a fixed namespace) it is not — collisions don't appear by chance.

Default to `sha256` if you're not sure. The output is 32 bytes (64 hex chars) and is fast enough for any non-tight-loop use.

## Example: a deterministic cache key

```ts
import { sha256 } from "@mongez/encryption";

function cacheKey(query: unknown) {
  return `q:${sha256(JSON.stringify(query))}`;
}
```

The input is JSON-stringified first because object property order can vary; if you need a truly canonical form, sort keys before stringify-ing. The hash absorbs whatever string you hand it — same input → same digest.

## Example: HMAC outside this package

The package does not export HMAC, but `crypto-js` does:

```ts
import HmacSHA256 from "crypto-js/hmac-sha256";

const tag = HmacSHA256("the message", "the key").toString();
```

If you need message authentication, use HMAC and a constant-time comparison — not raw `sha256`.
