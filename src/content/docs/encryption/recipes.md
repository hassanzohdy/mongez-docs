---
title: "Recipes"
name: mongez-encryption-recipes
description: |
  Idiomatic composition patterns for `@mongez/encryption` v2 — boot-time setup, tamper-evident URL tokens, binding ciphertext to a record, field-level encryption, key rotation, migrating v1.x data, error handling, and content-addressed cache keys.
sidebar:
  order: 99
---

Idiomatic compositions for `@mongez/encryption`. Pick the right tool for the threat first — read [`overview`](../overview/SKILL.md) if you haven't yet.

Everything here is v2: `encrypt`/`decrypt` are **async**, and `decrypt` **throws** on failure.

## Configured once, used everywhere

```ts
// src/setup/encryption.ts
import { setEncryptionConfigurations } from "@mongez/encryption";

const key = process.env.ENCRYPTION_KEY;

if (!key || key.length < 32) {
  throw new Error("ENCRYPTION_KEY is required and must be at least 32 chars");
}

setEncryptionConfigurations({ key });

// src/anywhere.ts
import { encrypt, decrypt } from "@mongez/encryption";

const cipher = await encrypt({ a: 1 }); // no args needed
const value  = await decrypt(cipher);
```

Treat `setEncryptionConfigurations` as boot-time only. In a multi-tenant server, pass the key explicitly per call instead — the configuration is process-global and concurrent requests would race.

## Handling failure

```ts
import { decrypt, DecryptionError, UnsupportedRuntimeError } from "@mongez/encryption";

try {
  return await decrypt(cipher, key);
} catch (error) {
  if (error instanceof DecryptionError) {
    // Wrong key, tampered, malformed, or a gated legacy ciphertext.
    // NOT "no value" — do not write a default over the stored value here.
    return null;
  }

  if (error instanceof UnsupportedRuntimeError) {
    // Insecure browser context or a runtime older than Node 20. A deployment
    // fault; let it surface.
    throw error;
  }

  throw error;
}
```

`tryDecrypt` collapses the first branch to `null` for you and re-throws the rest:

```ts
const value = await tryDecrypt(cipher, key);
```

Do not try to reconstruct *why* a `DecryptionError` happened. "Wrong key" and "tampered" share one message on purpose — GCM cannot distinguish them, and surfacing the difference would be a decryption oracle.

## Tamper-evident URL token

```ts
import { encrypt, tryDecrypt } from "@mongez/encryption";

const KEY = process.env.URL_TOKEN_KEY!;

async function makeToken(payload: { orderId: number; exp: number }) {
  // Standard base64 contains + and / — always URL-encode.
  return encodeURIComponent(await encrypt(payload, KEY));
}

async function readToken(raw: string) {
  const payload = await tryDecrypt(decodeURIComponent(raw), KEY);

  if (!payload) return null;                 // wrong key, garbage, or tampered
  if (payload.exp < Date.now()) return null; // freshness is still yours to enforce
  return payload;
}
```

**Threat model fit:** confidentiality *and* integrity — an edited token now fails rather than decoding to something else, which was the v1 hazard. It is still a **bearer** token: anyone who copies it can replay it until `exp`. It is not a substitute for a signed JWT when a third party must verify without your key.

## Bind a ciphertext to its record

The package exposes no caller-supplied AAD, so a ciphertext lifted from one row and dropped into another still decrypts. If placement carries meaning, put the binding in the plaintext and check it after decrypting:

```ts
async function sealFor(userId: string, value: unknown, key: string) {
  return encrypt({ userId, value }, key);
}

async function openFor(userId: string, cipher: string, key: string) {
  const payload = await decrypt(cipher, key);

  if (payload?.userId !== userId) {
    throw new Error("ciphertext does not belong to this user");
  }

  return payload.value;
}
```

Same trick for freshness: put an `exp` or a nonce inside the value — the envelope has neither.

## Field-level encryption

```ts
import { encrypt, decrypt, DecryptionError } from "@mongez/encryption";

async function storeSSN(userId: string, ssn: string) {
  await db.users.update(userId, { ssn: await encrypt(ssn, process.env.FIELD_KEY!) });
}

async function readSSN(userId: string) {
  const row = await db.users.find(userId);

  try {
    return await decrypt(row.ssn, process.env.FIELD_KEY!);
  } catch (error) {
    if (error instanceof DecryptionError) {
      // Not "missing" — tampered, or the key rotated. Alert; don't fall back.
      throw new Error(`unreadable ssn for ${userId}`);
    }
    throw error;
  }
}
```

Keeps the value out of backups, logs and read replicas in plaintext. It does **not** protect against an attacker who already holds both the database and the key — that is what a KMS and separated key custody are for.

Encrypted columns are also unsearchable and unindexable: ciphertext is non-deterministic, so `WHERE ssn = ?` cannot work. Store a `sha256` of a normalised form alongside it if you need equality lookup — and accept that the digest is then an offline-guessable fingerprint of a low-entropy value.

## Key rotation

The envelope carries no key identifier, so rotation is a re-encrypt:

```ts
import { encrypt, tryDecrypt, clearKeyCache } from "@mongez/encryption";

async function rotate(cipher: string, oldKey: string, newKey: string) {
  const value = await tryDecrypt(cipher, oldKey);

  if (value === null) return null; // not ours, or already rotated

  return encrypt(value, newKey);
}

clearKeyCache(); // once the old key is retired
```

For a store that is mid-rotation, try the new key first and fall back to the old one — two `tryDecrypt` calls. Clear the key cache when the old key is decommissioned so it stops living in process memory.

## Migrating from v1.x

v2 never writes the v1 format and refuses to read it unless you opt in. The full guide is in `MIGRATION.md`; the shape of it:

1. Deploy v2 to everything that **reads** the store, with `legacyDecryption: true`.
2. Only then let writes switch to v2 — **v1 cannot read v2 envelopes** (the format is forward-only).
3. Re-encrypt at rest, lazily on read or with a batch walk.
4. Turn `legacyDecryption` off and delete the fallback config.

```ts
import {
  decrypt,
  encrypt,
  isEncryptionEnvelope,
  isLegacyCipher,
} from "@mongez/encryption";

async function readAndUpgrade(storageKey: string, key: string) {
  const stored = storage.getItem(storageKey);

  if (!stored) return null;

  const value = await decrypt(stored, key, { legacyDecryption: true });

  // Upgrade in place the first time we touch an old value.
  if (isLegacyCipher(stored)) {
    storage.setItem(storageKey, await encrypt(value, key));
  }

  return value;
}
```

`isLegacyCipher` and `isEncryptionEnvelope` are pure string checks — a migration script can classify a whole store without holding the key.

Two things to be honest about while the flag is on:

- **Anything read through the legacy path is unauthenticated.** v1 had no MAC, so if an attacker could write to that storage, what you just read may have been altered. Re-encrypt and stop trusting the old copy.
- **Expect some rows to fail.** v1 returned `null` for corrupt data, so stores can carry damage nobody ever saw. Log and count failures before deleting anything — a spike may mean tampering, not corruption.

If v1 wrote your data with a non-default cipher:

```ts
import TripleDES from "crypto-js/tripledes";

await decrypt(old, key, { legacyDecryption: true, legacyDriver: TripleDES });
await decrypt(old, key, TripleDES); // v1-shaped call; implies legacyDecryption
```

## Encrypted browser storage

`@mongez/cache`'s `EncryptedLocalStorageDriver` / `EncryptedSessionStorageDriver` call `encrypt(...)` **synchronously** and write the result straight to storage — handed v2's promise they store `"[object Promise]"` and the value is lost. Until that package supports an async encryption contract, either pin `@mongez/encryption@^1` for the integration, or encrypt outside the cache:

```ts
import cache from "@mongez/cache";
import { encrypt, decrypt } from "@mongez/encryption";

cache.set("auth.accessToken", await encrypt(accessToken, KEY));

const stored = cache.get("auth.accessToken");
const accessToken = stored ? await decrypt(stored, KEY) : null;
```

The cache's own `{ data, expiresAt }` envelope is then no longer encrypted — wrap the expiry into the value yourself (`encrypt({ value, expiresAt }, KEY)`) if that metadata is sensitive.

> **Encrypting browser storage is not a trust boundary.** The passphrase ships to the page, so anyone with `window` access — an extension, devtools, an injected script — can call `decrypt` themselves. The win is against passive disk-state inspection and casual `localStorage` scraping. Truly sensitive material should stay server-side, exchanged for short-lived tokens.

## Content-addressed cache key

```ts
import { sha256 } from "@mongez/encryption";

function cacheKey(query: unknown) {
  return `q:${sha256(JSON.stringify(query))}`;
}

const value = cache.get(cacheKey({ user: 42, scope: "orders" }));
```

Same input → same digest. Use for deterministic cache keys, ETags, idempotency keys. **Never** use a ciphertext as a cache key — `encrypt` is non-deterministic, so every call produces a different string.

## Throwaway one-shot encryption

```ts
import { encrypt, decrypt } from "@mongez/encryption";

// A full-entropy random key: PBKDF2's job is to stretch weak passphrases, so
// with a key like this the work factor buys nothing — drop it to the floor.
const key = crypto.randomUUID() + crypto.randomUUID();

const cipher = await encrypt({ secret: "tea" }, key, { iterations: 100_000 });
const value  = await decrypt(cipher, key); // work factor comes from the envelope
```

`decrypt` takes no `iterations` option at all — it reads the count out of the envelope — so lowering the work factor for one message never breaks the round trip.

The key itself still has to reach the recipient somehow; this is not asymmetric crypto. For "key over channel A, message over channel B", use libsodium or WebCrypto ECDH.
