---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
<summary><span class="cl-version">[2.0.1]</span> <span class="cl-date">2026-08-17</span></summary>

Require Node 20+ (drop EOL Node 18; WebCrypto global unavailable by default before Node 19). No API change.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[2.0.0]</span> <span class="cl-date">2026-08-17</span> <span class="cl-label">Security release (MAJOR)</span> <span class="cl-counts">Why (security rationale) (2) · Breaking Changes (7) · Added (12) · Changed (5)</span></summary>

`encrypt`/`decrypt` are rebuilt on WebCrypto **AES-256-GCM** with **PBKDF2-HMAC-SHA256** key derivation and a versioned, authenticated envelope. This replaces the `crypto-js` AES-CBC construction v1.x used, which had **no authentication tag and a one-round-MD5 key derivation**. Every point below follows from that change. Upgrade guide: [`MIGRATION.md`](../MIGRATION/).

The hash exports (`md5`, `sha1`, `sha256`, `sha512`) are unchanged. Consumers who only import those are unaffected.

### Why (security rationale)

v1.x called `crypto-js`'s passphrase mode, which is OpenSSL's `EVP_BytesToKey`: **one round of MD5** over the passphrase and an 8-byte salt, feeding **AES-CBC with no MAC**. Two independent failures:

- **No integrity.** CBC without a MAC is malleable. Anyone who could write to the storage holding a ciphertext — `localStorage`, a URL, a database column, a queue — could flip bits in the plaintext without detection, and `decrypt` would hand the altered value back to the application as if it were authentic. Padding-oracle and bit-flipping attacks against unauthenticated CBC are textbook, not theoretical.
- **A key derivation that isn't one.** One MD5 round is roughly free on commodity hardware, so an offline attacker holding a ciphertext could brute-force a human-chosen passphrase at the speed of MD5. The KDF added no meaningful cost between "guess" and "test".

On top of that, `decrypt` returning `null` for every failure meant applications could not tell a wrong key from a tampered value from a corrupt row, so nobody could detect either — and `console.warn` on every failure let anyone probing an endpoint flood the logs.

v2 fixes all four: AEAD for integrity, PBKDF2 at an OWASP-aligned 210,000 iterations for the KDF, typed errors so failures are actionable, and silence on the failure path.

### Breaking Changes

- **`encrypt()` and `decrypt()` are now `async`** and return promises. WebCrypto's `subtle` API is promise-based, and PBKDF2 at the default work factor is far too slow to block a thread on. Every call site needs `await`; a missed one silently stores `[object Promise]`.
- **`decrypt()` throws instead of returning `null`.** A wrong key, a tampered envelope, a malformed input or a rejected legacy ciphertext all raise `DecryptionError`. Now that ciphertext is authenticated, a failure is real information — and `null` was always ambiguous, since `encrypt(null)` round-trips to `null`. **`tryDecrypt(cipher, key?, options?)`** is a new export providing the old null-on-failure shape; it still re-throws `MissingEncryptionKeyError` and `UnsupportedRuntimeError`, which are deployment bugs rather than bad ciphertext.
- **The pluggable cipher `driver` is removed from `encrypt()`.** Passing a cipher-shaped object in the third slot throws `EncryptionError`; that slot is now `{ iterations?: number }`. `setEncryptionConfigurations({ driver })` is deprecated — it can no longer influence encryption, only nominate the driver for the **legacy decrypt** path, and it logs one deprecation warning per process. AES-256-GCM is not negotiable: every alternative `crypto-js` offered (TripleDES, Rabbit, RC4) is weaker and none authenticate, and a configurable cipher is a standing downgrade risk.
- **v1.x ciphertext is rejected by default.** Reading it requires `setEncryptionConfigurations({ legacyDecryption: true })` or a per-call `{ legacyDecryption: true }` (a v1-style driver in the third positional slot implies it). Left silently readable, the legacy path would be a downgrade attack: an attacker able to write to your storage could replace an authenticated envelope with a malleable v1 blob and have the tampered plaintext accepted. Values read through this path are **not** authenticated — re-encrypt them, then turn the flag off.
- **New runtime floor: Node.js 18+, or a browser in a secure context (HTTPS/`localhost`).** Missing `crypto.subtle` or `crypto.getRandomValues` throws `UnsupportedRuntimeError`. There is deliberately no fallback — degrading to a non-CSPRNG or a hand-rolled cipher would defeat the migration. Hash exports are unaffected.
- **Ciphertext is forward-only.** v2 reads v1 (when enabled); v1 cannot read v2. Deploy v2 to every reader of a store *before* anything starts writing v2 into it, then re-encrypt.
- **`@mongez/cache` encrypted drivers are incompatible for now.** `EncryptedLocalStorageDriver`/`EncryptedSessionStorageDriver` call `encrypt(...)` synchronously and write the result to storage, which now yields `"[object Promise]"`. Pin `@mongez/encryption@^1` for that integration, or encrypt outside the cache — see [`MIGRATION.md`](../MIGRATION/).

### Added

- **AES-256-GCM with a 128-bit authentication tag.** Tampering with any byte of the envelope makes `decrypt` throw rather than return altered data.
- **PBKDF2-HMAC-SHA256 key derivation**, 210,000 iterations by default (OWASP-aligned), over a fresh 16-byte CSPRNG salt per message. Configurable globally (`iterations`) or per call; an integer in `100,000 … 5,000,000` when encrypting.
- **Versioned envelope**: `version(1) ‖ suite(1) ‖ iterations(4, uint32 BE) ‖ salt(16) ‖ nonce(12) ‖ ciphertext ‖ tag(16)`, base64-encoded. The 34-byte header is passed to AES-GCM as **additional authenticated data**, so the declared work factor, salt and nonce cannot be edited in transit — this closes a work-factor downgrade on existing ciphertext. The leading version byte makes future algorithm changes recognisable rather than silently misparsed.
- **A fresh 96-bit nonce per message**, drawn from the platform CSPRNG. Nonces and salts are never reused and never derived from the plaintext.
- **CPU-exhaustion guard.** The iteration count is read out of attacker-reachable ciphertext, so a declared value outside `1 … 5,000,000` is rejected *before* key derivation. Without the ceiling, a forged header claiming 4 billion iterations would pin a core for minutes before the tag check ran.
- **Typed error hierarchy** — `EncryptionError` (base), `MissingEncryptionKeyError`, `UnsupportedRuntimeError`, `DecryptionError`. `instanceof` survives transpilation to ES5. The "wrong key" and "tampered" cases share one message on purpose: GCM cannot distinguish them, and neither should the caller — the distinction is a decryption oracle.
- **`tryDecrypt(cipher, key?, options?)`** — null-on-failure decrypt for callers that want the v1 shape.
- **`clearKeyCache()`** — derived keys are memoised in-process by `(passphrase, salt, iterations)`, capped at 64 entries and non-extractable, because PBKDF2 costs ~100 ms a call. Clear it on logout, on key rotation, and between tests.
- **`resetEncryptionConfigurations()`** — restore import-time defaults.
- **Ciphertext inspection without decrypting** — `isEncryptionEnvelope()`, `isLegacyCipher()`, `parseEnvelope()`, plus the format constants (`ENVELOPE_VERSION_1`, `SUITE_PBKDF2_SHA256_AES_256_GCM`, `SALT_LENGTH`, `IV_LENGTH`, `AUTH_TAG_LENGTH`, `HEADER_LENGTH`, `DEFAULT_ITERATIONS`, `MIN_ITERATIONS`, `MAX_ITERATIONS`, `LEGACY_CIPHER_PREFIX`). Migration scripts can classify a whole store without holding the key.
- **New types** — `EncryptOptions`, `DecryptOptions`, `LegacyCipherDriver`, `EncryptionEnvelope`, alongside the existing `EncryptionConfigurations`.
- **`MIGRATION.md`** — v1 → v2 guide: adding `await`, handling the throw (or adopting `tryDecrypt`), enabling `legacyDecryption` to read old data, and the ordered rollout for re-encrypting a store.

### Changed

- **Nothing is logged on a decrypt failure.** v1.x `console.warn`'d on every one, handing a probing attacker a cheap way to flood logs — and, where values were sensitive, printing error detail into log sinks.
- **`md5` and `sha1` are marked `@deprecated`** in JSDoc so editors flag them at the call site. Both are collision-broken; they remain exported, unchanged, for legacy interop (cache keys, gravatar-style identifiers). `sha256`/`sha512` are untouched.
- **`crypto-js` remains a dependency** but no longer backs anything this package writes — only the hash exports and the opt-in legacy decrypt path.
- **Types no longer require `lib.dom` or `@types/node`** in the consumer's tsconfig; the WebCrypto surface is described structurally.
- **Docs rewritten** for the new API and threat model: `README.md`, `llms.txt`, `llms-full.txt`, and all five `skills/*/SKILL.md`. The threat-model tables now state plainly what v2 does *not* give you — caller-supplied AAD (so ciphertext is not bound to a record), key rotation/identification, replay protection, length hiding, and any change to the fact that a passphrase shipped to a browser is not a secret.

### Tests

```
74 passing (3 files)
```

Round-trip coverage across primitives, objects, arrays, unicode and 10k-character inputs; envelope layout and the recorded work factor; nonce/salt uniqueness across 40 encryptions; **tamper rejection for a bit flip in every byte of the envelope**, plus truncation, header/body splicing, an edited nonce, an edited work factor, an unknown suite, an unknown version and an absurd iteration count (asserted to fail in under a second); missing-key, non-string-key and circular-value handling; `UnsupportedRuntimeError` with no `crypto`, no `subtle`, and no `getRandomValues`; `tryDecrypt` semantics; legacy detection, opt-in gating, per-call and configured legacy drivers, the deprecation warning firing once, and a full legacy → v2 re-encryption path.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[1.1.3]</span> <span class="cl-date">2026-05-26</span> <span class="cl-counts">Added (6)</span></summary>

### Added

- **Test suite**. Vitest covering round-trip encrypt/decrypt across primitives, objects, arrays, unicode, very-long inputs, and the empty-string boundary; the explicit-driver overload (`AES`, `TripleDES`); known-answer vectors for `md5`/`sha1`/`sha256`/`sha512`; configuration-default semantics; and decrypt failure modes (wrong key, malformed cipher, empty string).
- **README** with a prominent **security notice** spelling out the threat model: these helpers wrap `crypto-js`'s passphrase-keyed AES-CBC + OpenSSL-style MD5 KDF; ciphertext is not authenticated; `md5`/`sha1` are not collision-resistant. Includes explicit "use for" / "do NOT use for" lists.
- **CHANGELOG**, **`llms.txt`**, **`llms-full.txt`**, and a **`skills/`** folder (`README`, `overview` with a security-boundaries section, `encrypt-decrypt`, `hashes`, `configuration`, `recipes`) for tool-assisted development.
- **`vitest.config.ts`** with the `node` environment and the self-detecting sibling-alias pattern used elsewhere in the workspace.
- **CI**. GitHub Actions workflow: Node 18/20/22 × Ubuntu, plus Node 20 × Windows.
- **`package.json` polish**. `sideEffects: false`, sharper `description`, expanded `keywords`, `vitest` and `typescript` dev-dependencies, `test` / `test:watch` scripts.

### Tests

```
30 passing
```

</details>
