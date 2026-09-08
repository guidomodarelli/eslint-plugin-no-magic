# no-duplicate-constants

Finds repeated primitive `const` definitions within the same lexical scope.
This advisory rule is opt-in and does not assume equal values mean equal concepts.

## Reported

```js
const PRIMARY_TIMEOUT_MS = 5000;
const SECONDARY_TIMEOUT_MS = 5000; // Review whether one definition is appropriate.
```

## Valid

```js
const REQUEST_TIMEOUT_MS = 5000;
const PRIMARY_TIMEOUT_MS = REQUEST_TIMEOUT_MS;
const SECONDARY_TIMEOUT_MS = REQUEST_TIMEOUT_MS;
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `ignoreValues` | `[]` | Exact string/number values excluded from analysis. |
| `ignoreConstantNames` | `[]` | Unique, exact, case-sensitive names excluded as both initial candidates and later reports. |

```js
"no-magic/no-duplicate-constants": ["warn", {
  ignoreValues: [100],
  ignoreConstantNames: ["DOCUMENTED_EXTERNAL_LIMIT"],
}]
```

Or use `createConfig({ constantDuplicates: { ignoreValues: [100] } })`.

## Boundaries

Checks direct identifier declarations with primitive string or number initializers,
negative numeric literals, static templates, and TypeScript assertions. It does
not execute expressions or follow aliases/imports. Destructuring is excluded.

Empty strings and numeric `-1`, `0`, and `1` are ignored. Boolean initializers
are not candidates. String and numeric values are distinct. Unlike duplicate
strings, nonempty single-character constant values can be reported here.

Scopes are independent. Only later equal-value definitions are reported, with
the first declaration's name and location. There is no cross-file analysis,
folder-placement advice, or automatic fix. Keep separate definitions when they
represent independent business concepts, and use explicit exclusions as needed.
