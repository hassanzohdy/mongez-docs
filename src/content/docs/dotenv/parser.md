---
title: "Parser"
name: mongez-dotenv-parser
description: |
  API reference for `parseLine`, `parseValue`, `env`, and `env.all` — the parsing and value-reading layer of `@mongez/dotenv`.
sidebar:
  order: 50
---

`parseLine` and `parseValue` are the two parser entry points. `env` / `env.all` read from the store the parser populates.

## Signatures

```ts
function parseLine(line: string): [string, any] | []
function parseValue(value: any): any

const env: {
  (key: string, defaultValue?: any): any;
  all(): Record<string, any>;
};
```

## `parseLine`

Takes one line of file content, returns either `[key, parsedValue]` or `[]` for non-data lines (comments, blanks, lines without an `=`).

```ts
parseLine("APP_PORT=3000");        // ["APP_PORT", 3000]
parseLine('APP_NAME="My App"');    // ["APP_NAME", "My App"]
parseLine("DEBUG=true");           // ["DEBUG", true]
parseLine("EST_TIME=null");        // ["EST_TIME", null]
parseLine("# comment");            // []
parseLine("");                     // []
parseLine("NO_EQUALS_HERE");       // []
parseLine("APP_DEBUG=");           // ["APP_DEBUG", ""]
```

The split happens on the FIRST `=`; remaining `=` characters stay in the value:

```ts
parseLine("KEY=a=b=c");            // ["KEY", "a=b=c"]
```

Destructuring is safe on non-data lines — both elements come back as `undefined`:

```ts
const [key, value] = parseLine("# comment");
// key === undefined, value === undefined
```

## `parseValue` — the coercion table

| Input | Output | Notes |
|---|---|---|
| `"3000"` | `3000` (number) | Coerced only on an exact round trip |
| `"3.14"` | `3.14` (number) | Decimals supported |
| `"-7"` | `-7` (number) | Negatives supported |
| `"0123456789"` | `"0123456789"` (string) | Leading zero would be lost |
| `"1e5"` | `"1e5"` (string) | Exponent notation does not round-trip |
| `"+15551234567"` | `"+15551234567"` (string) | `+` would be stripped |
| `"Infinity"` / `"NaN"` | string | Never what a config file meant |
| `"true"` | `true` (boolean) | Case-sensitive |
| `"false"` | `false` (boolean) | Case-sensitive |
| `"null"` | `null` | Case-sensitive |
| `"My App"` | `"My App"` (string) | Stays as-is |
| `"True"` | `"True"` (string) | Wrong case — stays as a string |
| `'"3000"'` | `"3000"` (string) | Quotes opt OUT of coercion |
| `'"a \\"b\\" c"'` | `'a "b" c'` (string) | `\"` is unescaped |
| `""` | `""` | Empty input passes through |
| `undefined` | `undefined` | Falsy input passes through |

`true` / `false` / `null` matching is exact — case-sensitive, no whitespace tolerance beyond `String(value).trim()`.

### Numbers coerce only on an exact round trip

`isNumeric` is `Number.isFinite(n) && String(n) === value`, not `!isNaN(value)`. A value becomes a number only when converting it back to a string gives the original characters, so nothing that would lose information is ever converted:

```ts
parseValue("3000");                // 3000            — round-trips
parseValue("0123456789");          // "0123456789"    — leading zero would be lost
parseValue("1234567890123456789"); // string          — beyond MAX_SAFE_INTEGER
parseValue("0x1F");                // "0x1F"          — would become 31
parseValue("1e5");                 // "1e5"           — would become 100000
parseValue("+15551234567");        // "+15551234567"  — `+` would be stripped
parseValue("1.50");                // "1.50"          — trailing zero is significant
parseValue("Infinity");            // "Infinity"
parseValue("NaN");                 // "NaN"
```

The same rule governs values read from `process.env`. That symmetry is the point: in a `.env` file an author can opt out of coercion by quoting, but a platform-injected value is never quote-stripped, so the operator has no opt-out — and injected secrets, account IDs and tokens are exactly the values that look numeric.

## `${VAR}` interpolation

A value containing `${VAR}` substitutes another key from the internal store:

```ts
// In a file:
//   APP_HOST=localhost
//   APP_PORT=3000
//   APP_URL=http://${APP_HOST}:${APP_PORT}

env("APP_URL");
// "http://localhost:3000"
```

Resolution rules:

1. The substitution is read from the internal store (`envData`) first, then from `process.env`. A key the platform injected resolves even though no file declares it.
2. Substitution happens at parse time. Later mutations to the referenced key do not re-run substitution.
3. A reference that resolves in neither place **throws, naming the key**:

```ts
parseValue("prefix:${UNKNOWN}:suffix");
// Error: Cannot resolve ${UNKNOWN}: "UNKNOWN" is not defined in the loaded env
// data or in process.env. Forward references are not supported — declare
// "UNKNOWN" before the line that references it, or in .env.shared, which loads first.
```

   Before 1.3.0 this returned the literal string `"prefix:undefined:suffix"` — a corrupted value that starts the app and fails much later, far from the cause. Emitting a broken string is never better than a named error.

4. Inside a `loadEnvFile` run, lines are processed top-to-bottom, so **forward references are unsupported**. A `${VAR}` reference must point to a key from an earlier line, from `.env.shared` (which loads first), or from `process.env` — otherwise it throws.

## Reading values

Lookup order is **internal store → `process.env` → `defaultValue`**.

```ts
env("APP_PORT");                  // 3000     (number — typed, from .env)
env("APP_PORT", 8080);            // 3000     (loaded value wins over default)
env("NODE_ENV");                  // "test"   (from process.env — no file declares it)
env("MISSING");                   // undefined
env("MISSING", "default");        // "default"
env("MISSING", 0);                // 0
env("MISSING", false);            // false
env.all();                        // { APP_NAME: "...", APP_PORT: 3000, ... }
```

A value that comes from the `process.env` step is coerced to a primitive the same way a file value is — `"8080"` → `8080`, `"true"` → `true`, `"null"` → `null` — so a key's type does not depend on whether it arrived from a file or from the platform. That coercion is deliberately narrower than `parseValue`: no quote stripping and no `${VAR}` interpolation, because a real environment variable is a literal value (a quote or a `${` inside it belongs to the secret). Values with significant leading/trailing whitespace are returned untouched.

Before 1.3.0 `env()` never consulted `process.env`, so any platform-injected variable that no `.env` file happened to name returned its default forever — including `env("NODE_ENV")` before `loadEnv()` had run at all.

`env(key, default)` uses `key in envData` (not `??`), so a deliberately-loaded `null` is preserved and distinguishable from a missing key:

```ts
// .env contains: EST_TIME=null
env("EST_TIME");                  // null
env("EST_TIME", "fallback");      // null  (loaded null wins over default)
env.all().EST_TIME;               // null
```

## `env.all()` is the store by reference

```ts
const all = env.all();
all.HACKED = "yes";

env("HACKED");   // "yes"  — mutations to env.all() leak into the store
```

Treat the return as read-only. It contains only what the `.env` files declared — it is deliberately NOT merged with `process.env`, or every iteration over it would become a dump of the machine's variables. Use `env(key)` when you want the `process.env` fallback.

## Standalone `parseLine` / `parseValue`

You can call the parser without going through `loadEnv` / `loadEnvFile`:

```ts
parseLine('PORT=3000');           // ["PORT", 3000]
parseValue('"hello world"');      // "hello world"
```

But `${VAR}` substitution reads from the module's `envData` store (empty until something populates it), then from `process.env`. So `parseValue("${X}")` **throws** unless `X` was set by an earlier `loadEnv` / `loadEnvFile` call or exists in the real environment.
