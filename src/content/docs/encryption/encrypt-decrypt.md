---
title: "Encrypt Decrypt"
name: mongez-encryption-encrypt-decrypt
description: |
  Detailed reference for `encrypt`, `decrypt` and `tryDecrypt` in `@mongez/encryption` — async signatures, the AES-256-GCM envelope, the typed error hierarchy, failure modes, and the derived-key cache.
sidebar:
  order: 50
---

The three flagship functions. **All are async in v2**, and `decrypt` **throws** where v1.x returned `null`.

## Signatures

```ts
encrypt(value: any, key?: string, options?: EncryptOptions): Promise<string>
decrypt(cipher: string, key?: string, options?: DecryptOptions | LegacyCipherDriver): Promise<any>
tryDecrypt(cipher: string, key?: string, options?: DecryptOptions | LegacyCipherDriver): Promise<any | null>

type EncryptOptions = { iterations?: number };
type DecryptOptions = { legacyDecryption?: boolean; legacyDriver?: LegacyCipherDriver };
```

- `key` falls back to the configured default from `setEncryptionConfigurations({ key })`; with neither, all three throw `MissingEncryptionKeyError`. A non-string key throws `EncryptionError`.
- `encrypt`'s third argument is **not** a cipher driver any more. Passing a cipher-shaped object there throws — v2 always uses AES-256-GCM.
- `decrypt`'s third argument also accepts a v1.x cipher driver in the position v1 callers used, read as `{ legacyDriver, legacyDecryption: true }`.

## Round trip

```ts
import { encrypt, decrypt } from "@mongez/encryption";

const cipher = await encrypt({ userId: 42 }, "my-key");
const value  = await decrypt(cipher, "my-key");
// value === { userId: 42 }
```

Reversible for any JSON-encodable value: primitives, arrays, plain objects, nested combinations, unicode, very long strings.

## What encrypt does

1. Validates the key and rejects a cipher driver in the options slot.
2. Validates the work factor — an integer in `100_000 … 5_000_000`.
3. Wraps the value as `{ data: value }` and `JSON.stringify`s it. A circular value rejects here, before any randomness is drawn.
4. Draws a fresh 16-byte salt and 12-byte nonce from the platform CSPRNG.
5. Derives a 256-bit, non-extractable AES-GCM key with PBKDF2-HMAC-SHA256.
6. Seals the payload with AES-256-GCM, passing the 34-byte header as **additional authenticated data**.
7. Returns `base64(header ‖ ciphertext ‖ tag)`.

## What decrypt does

1. Validates the key; rejects an empty or non-string cipher.
2. Base64-decodes and checks the leading version byte. Not a v2 envelope → the legacy path.
3. Rejects a truncated envelope, an unknown suite, or an out-of-range work factor **before deriving any key**.
4. Re-derives the key from the passphrase plus the envelope's own salt and iteration count.
5. Verifies the GCM tag over header + ciphertext, then decrypts.
6. `JSON.parse`s the plaintext and returns `.data`.

## Envelope format

```
byte 0        envelope version   (0x01)
byte 1        cipher suite       (0x01 = PBKDF2-SHA256 → AES-256-GCM, 128-bit tag)
bytes 2–5     PBKDF2 iterations  (uint32, big-endian)
bytes 6–21    salt               (16 bytes)
bytes 22–33   nonce / IV         (12 bytes)
bytes 34–     ciphertext ‖ GCM tag (trailing 16 bytes)
```

The **whole header is authenticated as AAD**, so the declared work factor, salt and nonce are tamper-evident — nobody can shave the iteration count off an existing ciphertext. Overhead is 50 bytes plus base64 expansion. The leading version byte makes the format self-describing, so a future algorithm change is recognised rather than misparsed.

Exported constants and helpers: `ENVELOPE_VERSION_1`, `SUITE_PBKDF2_SHA256_AES_256_GCM`, `SALT_LENGTH`, `IV_LENGTH`, `AUTH_TAG_LENGTH`, `AUTH_TAG_LENGTH_BITS`, `HEADER_LENGTH`, `DEFAULT_ITERATIONS`, `MIN_ITERATIONS`, `MAX_ITERATIONS`, `parseEnvelope`, `isEncryptionEnvelope`, `buildHeader`, `encodeEnvelope`.

```ts
isEncryptionEnvelope(cipher); // true for our own v2 output, false for anything else
```

Both `isEncryptionEnvelope` and `isLegacyCipher` are pure string checks — a migration script can classify a whole store without holding the key.

## Errors

```
EncryptionError                 base class — catch for any failure from the package
├─ MissingEncryptionKeyError    no key per call and none configured
├─ UnsupportedRuntimeError      no crypto.subtle / no crypto.getRandomValues
└─ DecryptionError              wrong key, tampered, malformed, or gated legacy ciphertext
```

`instanceof` survives transpilation to ES5.

```ts
import { decrypt, DecryptionError } from "@mongez/encryption";

try {
  return await decrypt(cipher, key);
} catch (error) {
  if (error instanceof DecryptionError) return badRequest(); // bad input
  throw error; // missing key / unusable runtime — a deployment bug
}
```

## Failure modes

| Situation | Behavior |
|---|---|
| Wrong key | `DecryptionError`: *"Authentication failed: the ciphertext was modified, or the key is wrong."* |
| Tampered ciphertext (any byte, header included) | The **same** error, deliberately. GCM cannot tell the two apart, and exposing the difference would hand an attacker a decryption oracle. |
| Truncated / short envelope | `DecryptionError` — *"shorter than its own header and authentication tag."* |
| Unknown cipher suite byte | `DecryptionError` — the ciphertext came from a newer version of this package. |
| Work factor outside `1…5,000,000` | `DecryptionError` raised before key derivation (CPU-exhaustion guard). |
| Unknown version / not base64 / no legacy prefix | `DecryptionError` — *"Unrecognised ciphertext."* |
| v1.x ciphertext with the legacy path disabled | `DecryptionError` naming `legacyDecryption: true`. |
| Empty string or non-string cipher | `DecryptionError`. |
| No key per call and none configured | `MissingEncryptionKeyError`. |
| Non-string key | `EncryptionError` — *"The encryption key must be a string…"* |
| Cipher driver passed to `encrypt` | `EncryptionError` — *"no longer takes a cipher driver."* |
| `iterations` outside `100_000…5,000,000` at encrypt time | `EncryptionError` — *"Invalid PBKDF2 iterations."* |
| No WebCrypto / no CSPRNG | `UnsupportedRuntimeError`. Never a downgrade. |
| Circular reference in `value` | `encrypt` rejects from `JSON.stringify`, before any randomness is drawn. |
| `undefined` or a function as `value` | Round-trips to `undefined` — JSON drops it. Unchanged from v1. |

Nothing is logged on failure. v1.x `console.warn`'d on every one, which let anyone probing an endpoint flood the logs.

## decrypt vs tryDecrypt

`tryDecrypt` returns `null` for a `DecryptionError` and re-throws `MissingEncryptionKeyError` and `UnsupportedRuntimeError` — those are deployment faults, not bad ciphertext, and swallowing them would hide the bug.

```ts
const value = await tryDecrypt(cipher, key); // null on wrong key / tamper / garbage
if (value === null) return badRequest();
```

Prefer `decrypt`. `null` is ambiguous: `encrypt(null)` round-trips to `null`, so `tryDecrypt` cannot distinguish "failed" from "successfully decrypted a null". Code that treats `null` as "no value yet" and writes a default over it will silently destroy data when a key is wrong.

## Non-determinism

```ts
(await encrypt("hello", "k")) === (await encrypt("hello", "k"));
// false — fresh salt and nonce every call
```

Both decrypt to `"hello"`. **Never compare ciphertexts for equality**, index one, or use one as a cache key. For a stable token over the same input, hash it with `sha256` and use the digest.

## The derived-key cache

PBKDF2 at 210,000 iterations costs on the order of 100 ms per call, so derived keys are memoised in-process by the exact `(passphrase, salt, iterations)` triple, capped at 64 entries; failed derivations are never cached. A hit requires the same passphrase *and* the same salt, and the cached `CryptoKey` is non-extractable, so the cache never widens who can decrypt what — but it does keep material resident for the process lifetime.

```ts
import { clearKeyCache } from "@mongez/encryption";

clearKeyCache(); // on logout, on key rotation, between tests
```

## Reading v1.x ciphertext

Off by default, because v1.x ciphertext is unauthenticated and leaving it silently readable is a downgrade path: an attacker able to write to your storage could swap an authenticated envelope for a malleable legacy blob.

```ts
setEncryptionConfigurations({ legacyDecryption: true });   // migration window
await decrypt(oldCipher, key, { legacyDecryption: true }); // or per call

import TripleDES from "crypto-js/tripledes";
await decrypt(oldCipher, key, { legacyDecryption: true, legacyDriver: TripleDES });
await decrypt(oldCipher, key, TripleDES); // v1-shaped call; implies legacyDecryption
```

Values read this way are **not** authenticated — re-encrypt them and stop trusting the old copy. And the format is **forward-only**: v1.x cannot read v2 envelopes, so deploy v2 to every reader before any writer emits v2.

## Examples

### A tamper-evident URL token

```ts
import { encrypt, tryDecrypt } from "@mongez/encryption";

// Standard base64 contains + and / — always URL-encode.
const token = encodeURIComponent(
  await encrypt({ orderId: 4242, exp: Date.now() + 3_600_000 }, KEY),
);

const claims = await tryDecrypt(decodeURIComponent(raw), KEY);
if (!claims || claims.exp < Date.now()) throw new Error("invalid or expired token");
```

Confidentiality *and* integrity — but still a bearer token: anyone who copies it can replay it until `exp`. Use a signed JWT when a third party must verify without your key.

### Tuning the work factor

```ts
await encrypt(value, key, { iterations: 600_000 }); // slower, stronger
```

The count used is recorded in the envelope, so raising it later does not orphan older ciphertexts — they decrypt at the count they were sealed with.

### Distinguishing "value was null" from "decrypt failed"

With `decrypt` this is free: a failure throws, and `null` means the value really was `null`. Only `tryDecrypt` carries the old ambiguity, which is a reason to prefer `decrypt`.
