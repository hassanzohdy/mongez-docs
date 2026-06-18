---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

<details class="changelog-version" open>
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
