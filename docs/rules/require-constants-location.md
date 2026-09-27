# require-constants-location

Requires static module-level constants to be declared in modules dedicated to
constants, for example `src/constants/`. This opt-in rule enforces placement;
naming and reuse remain the responsibility of the other rules.

## Reported

```js
// src/services/request.js
export const REQUEST_TIMEOUT_MS = 5000; // Move to a constants module.
```

## Valid

```js
// src/constants/request.js
export const REQUEST_TIMEOUT_MS = 5000;

// src/services/request.js
import { REQUEST_TIMEOUT_MS } from "../constants/request.js";
export const STARTED_AT = Date.now(); // Runtime value, not a static constant.
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `patterns` | `["**/constants/**"]` | Globs of modules owning constants, relative to the ESLint working directory. Supports `**`, `*` and `?`; other characters match literally. |
| `exportedOnly` | `true` | Report only constants exported directly or through `export { NAME }`. `false` also reports unexported module-level constants. |
| `ignoreConstantNames` | `[]` | Unique, exact, case-sensitive names never reported. |

```js
"no-magic/require-constants-location": ["warn", {
  patterns: ["src/constants/**", "src/**/constants.ts"],
  exportedOnly: false,
}]
```

Or use `createConfig({ constantsLocation: { exportedOnly: false } })`, or the
`constants-refactor` preset, which enables it with `exportedOnly: false`.

## Boundaries

Only top-level `const` declarations with identifier names are checked. A value
is static when it is a literal (including regular expressions and `null`), a
template without interpolation, a negative number, or an array/object composed
only of those, through TypeScript `as`, `satisfies`, and non-null wrappers.

Values referencing identifiers, spreads, calls, computed keys other than
literals, methods, getters, or interpolations are treated as runtime values and
are never reported. Destructuring, `let`/`var`, and nested scopes are excluded.
The rule does not move code, resolve imports, or decide which constants module
is cohesive for a domain. Use flat config `files`/`ignores` to exclude tests,
fixtures, or generated code.
