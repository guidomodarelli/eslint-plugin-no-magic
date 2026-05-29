# eslint-plugin-no-magic

ESLint plugin that flags **magic string literals only where they matter**: a
literal is "magic" when it participates in logic, a protocol, or a business
contract whose meaning should be named — not merely because it is a string.

Reporting every string literal turns the linter into noise (JSX props, imports,
object keys, type unions, human copy are all strings). This plugin reports a
string only when it is one of:

- an operand of an equality/inequality comparison (`===`, `!==`, `==`, `!=`),
- a `switch` `case` test,
- an argument to a known **behavioral sink** (analytics, storage, feature
  flags, routing, etc.),
- the `type` of an object passed to an action dispatcher
  (`dispatch({ type: "..." })`),
- or **duplicated** across the file at or above a configurable threshold.

Everything else is ignored by default: JSX attribute values, visible JSX copy,
inline SVG markup, `import`/`export` sources, runtime directives
(`"use client"`), `typeof` comparison vocabulary, object keys, property-name
access, TypeScript literal-union types, `enum` member initializers, extracted
`const` definitions, and `next/font` loader options.

## Install

```bash
npm install --save-dev eslint-plugin-no-magic
```

Requires ESLint 9+ (flat config).

## Usage

### Quick start (recommended flat config)

```js
// eslint.config.mjs
import noMagic from "eslint-plugin-no-magic";

export default [
  ...noMagic.configs.recommended,
];
```

### Manual wiring

```js
import noMagic from "eslint-plugin-no-magic";

export default [
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    plugins: { "no-magic": noMagic },
    rules: {
      "no-magic/no-magic-strings": "error",
    },
  },
];
```

## Rule: `no-magic-strings`

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sinks` | `string[]` | `track`, `trackEvent`, `sendEvent`, `logEvent`, `captureEvent`, `getItem`, `setItem`, `removeItem`, `isFeatureEnabled`, `isEnabled`, `getFlag`, `navigate`, `push`, `replace` | Callee names whose string arguments are treated as contracts. Matches both `track("x")` and `obj.method("x")` by the called name. |
| `actionTypeCallees` | `string[]` | `["dispatch"]` | Callees whose object argument's action-type property is treated as a contract. |
| `actionTypeProperty` | `string` | `"type"` | The property name inspected inside `actionTypeCallees` arguments. |
| `minDuplicates` | `integer >= 0` | `3` | Report a value repeated this many times (across non-allowlisted positions). `0` disables duplicate detection. |
| `ignoreStrings` | `string[]` | `[]` | Exact string values that are always allowed. |

```js
"no-magic/no-magic-strings": ["error", {
  sinks: ["track", "getItem", "setItem", "removeItem", "push", "replace"],
  minDuplicates: 3,
  ignoreStrings: ["latin"],
}]
```

## Magic numbers

This plugin does **not** re-implement magic-number detection. Use the upstream
[`@typescript-eslint/no-magic-numbers`](https://typescript-eslint.io/rules/no-magic-numbers)
rule directly. Sensible defaults are exported for convenience:

```js
import tseslint from "typescript-eslint";
import { recommendedMagicNumberOptions } from "eslint-plugin-no-magic";

export default [
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: { parser: tseslint.parser },
    rules: {
      "@typescript-eslint/no-magic-numbers": ["error", recommendedMagicNumberOptions],
    },
  },
];
```

`recommendedMagicNumberOptions` ignores `-1, 0, 1`, array indexes, default
values, enums, numeric literal types, and `readonly` class properties, and
enforces `const`.

## Development

```bash
npm install
npm test     # node --test + RuleTester
npm run lint
```

## Publishing

Authentication uses an npm automation token read from the environment. `.npmrc`
points the registry auth token at `${NPM_TOKEN}`; npm substitutes it from the
process environment (npm does not read `.env` itself, so load it first).

1. Copy the env template and fill in the token:
   ```bash
   cp .env.example .env   # then edit .env and set NPM_TOKEN
   ```
2. Load `NPM_TOKEN` into the environment and publish:
   - PowerShell:
     ```powershell
     $env:NPM_TOKEN = (Get-Content .env | Where-Object { $_ -match '^NPM_TOKEN=' }) -replace '^NPM_TOKEN=', ''
     npm publish --access public
     ```
   - bash/zsh:
     ```bash
     export $(grep -v '^#' .env | xargs) && npm publish --access public
     ```

`.env` is gitignored and `.npmrc` is excluded from the published tarball by the
`files` whitelist in `package.json`, so neither the token nor the auth config
ship with the package.

## License

MIT
