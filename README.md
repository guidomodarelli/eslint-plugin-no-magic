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
structural literals inside inline SVG markup, `import`/`export` sources, runtime
directives (`"use client"`), `typeof` comparison vocabulary, object keys,
property-name access, TypeScript literal-union types, `enum` member
initializers and extracted `const` definitions. No imports, packages, or
framework names receive special exemptions. JSX and SVG handling is syntax-based.

## Install

```bash
pnpm add --save-dev eslint-plugin-no-magic
```

Requires ESLint 10.10+ (flat config) and Node.js 26.x (`^26.0.0`).
Development uses pnpm 12+ (pinned to 12.3.4) and Vitest 5.

## Shared configuration

```js
import { createConfig } from "eslint-plugin-no-magic";

export default createConfig({
  files: ["src/**/*.{js,ts,tsx}"],
  contracts: { sinks: [{ callee: "client.send", argumentIndex: 1 }] },
  duplicates: { minDuplicates: 3 },
  contractSeverity: "error",
  duplicateSeverity: "warn",
});
```

`createConfig` synchronizes contract classification in both rules and copies
options so callers cannot mutate subsequent configurations. Contract allowlists
are shared by default; duplicate `ignoreStrings` can override them. Disabling
contracts automatically enables duplicate reporting on contract positions unless
`duplicates.ignoreContracts` explicitly overrides it. Configure the parser in
another flat config entry when using TypeScript or non-JavaScript syntax.

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
      "no-magic/no-magic-contracts": "error",
      "no-magic/no-duplicate-strings": "warn",
    },
  },
];
```

## Independent rules

The recommended preset enables `no-magic-contracts` as an error and
`no-duplicate-strings` as a warning with `ignoreContracts: true`. Both can be configured independently:

```js
export default [
  ...noMagic.configs.recommended,
  { rules: {
    "no-magic/no-magic-contracts": ["error", { ignoreStrings: ["legacy"] }],
    "no-magic/no-duplicate-strings": ["warn", { minDuplicates: 4 }],
  } },
];
```

`no-magic-contracts` accepts `sinks`, `actionTypeCallees`, `actionTypeProperty`,
and `ignoreStrings`. `no-duplicate-strings` accepts `minDuplicates`,
`ignoreStrings`, `ignoreContracts`, and `contractOptions`.

`ignoreContracts` defaults to `true` in all configurations. It omits duplicate diagnostics on contract positions
while retaining those occurrences in the duplicate count. This is a syntactic
classification, not coordination between enabled rules: if you disable the
contract rule and want duplicate reports everywhere, set `ignoreContracts: false`.

When customizing contract detection, pass the same options to `contractOptions`:

```js
const contractOptions = { sinks: [{ callee: "client.send", argumentIndex: 1 }] };
// Rules in your flat configuration:
const rules = {
  "no-magic/no-magic-contracts": ["error", contractOptions],
  "no-magic/no-duplicate-strings": ["warn", {
    ignoreContracts: true, contractOptions, minDuplicates: 3,
  }],
};
```

A value in `contractOptions.ignoreStrings` remains eligible for duplication;
`ignoreStrings` on the duplicate rule itself excludes it entirely. Disable the
duplicate rule if only contract detection is wanted.

`no-magic-strings` was deprecated in 0.2.2 and removed in 1.0.0. It is no longer
registered or shipped. See [migration notes](MIGRATION.md).

## Contract and duplicate rule options

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sinks` | `(string \| { callee: string, argumentIndex: number })[]` | `track`, `trackEvent`, `sendEvent`, `logEvent`, `captureEvent`, `getItem`/`setItem`/`removeItem` (argument 0), `isFeatureEnabled`, `isEnabled`, `getFlag`, `navigate`, `{ callee: "router.push", argumentIndex: 0 }`, `{ callee: "router.replace", argumentIndex: 0 }` | Callee names whose string arguments are treated as contracts. Strings match method names or full static paths; descriptors match a method name or full static path and a zero-based argument index. |
| `actionTypeCallees` | `string[]` | `["dispatch"]` | Callees whose object argument's action-type property is treated as a contract. |
| `actionTypeProperty` | `string` | `"type"` | The property name inspected inside `actionTypeCallees` arguments. |
| `minDuplicates` | `integer >= 0` | `3` | Report a value repeated this many times (across non-allowlisted positions). `0` disables duplicate detection. |
| `ignoreStrings` | `string[]` | `[]` | Exact string values that are always allowed. |

```js
"no-magic/no-magic-contracts": ["error", {
  sinks: ["track", "getItem", "setItem", "removeItem",
    { callee: "router.push", argumentIndex: 0 },
    { callee: "router.replace", argumentIndex: 0 }],
  ignoreStrings: ["latin"],
}]
```

JSX and SVG presentation values remain allowed, but comparisons, action types,
and configured calls inside their expressions are checked. TypeScript `as`,
`satisfies`, type assertions, and non-null assertions preserve this detection.
Single-character values are checked in these behavioral contexts; only duplicate
checking ignores them. `ignoreStrings` still explicitly allows exact values.

Duplicate counts include occurrences already reported for a behavioral context,
without reporting the same node twice. `minDuplicates: 0` disables counting.

Routing defaults now match only `router.push` and `router.replace`, argument 0.
For a differently named router, configure its static path explicitly. Legacy
`sinks: ["push", "replace"]` still opts into matching every method with those
names. Descriptors do not resolve aliases or infer receiver types.

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
pnpm install
pnpm test     # Vitest 5 + ESLint RuleTester
pnpm lint
pnpm typecheck # Public configuration types
pnpm benchmark # Deterministic end-to-end lint benchmark
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
     pnpm publish --access public
     ```
   - bash/zsh:
     ```bash
     export $(grep -v '^#' .env | xargs) && pnpm publish --access public
     ```

`.env` is gitignored and `.npmrc` is excluded from the published tarball by the
`files` whitelist in `package.json`, so neither the token nor the auth config
ship with the package.

## License

MIT

## Typed configuration

The package includes TypeScript declarations and exports `NoMagicContractsOptions`
and `SinkDescriptor` for typed consumer configuration:

```ts
import type { NoMagicContractsOptions } from "eslint-plugin-no-magic";

const options = {
  sinks: [{ callee: "router.push", argumentIndex: 0 }],
} satisfies NoMagicContractsOptions;
```

Contract detection follows ternary value branches and logical fallbacks, including
TypeScript wrappers. Computed static dispatcher/property names are equivalent to
dot notation. Storage defaults inspect only argument 0 (the key), and preserve
method-name matching for custom storage receivers. Real directive prologues and
visible JSX copy in conditional branches remain exempt from duplicate reporting.

CI runs frozen installation, lint, type checks, and tests on Windows and Linux
with Node 26. The suite packs the package and checks real ESLint
behavior and declaration consumption from the extracted artifact.

### TypeScript compiler compatibility

Type checking uses TypeScript 7 (`tsc`), installed as
`@typescript/native: npm:typescript@^7.0.2`. The ESLint parser still requires the
TypeScript 6 API, so `typescript` aliases `@typescript/typescript6` for parsing.
Both are real implementations; the compatibility package exposes `tsc6` and
does not replace the TypeScript 7 compiler used by `pnpm typecheck` or the
packaged consumer test. This follows Microsoft's
[side-by-side installation guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

## Performance baseline

`pnpm benchmark` compares parsing alone and the recommended
independent rules on 300, 3,000, and 15,000 literals in JavaScript, JSX,
TypeScript, and expressions with 40 nested conditional branches. Every run asserts diagnostic
counts. It records the median of five measured runs after two warmups, along
with Node, ESLint, OS, and CPU metadata. See [the baseline](benchmarks/RESULTS.md).
The benchmark includes parsing and diagnostic construction; it is not an isolated
rule timing or a CI performance threshold.

## Advisory constant rules

These optional rules implement statically verifiable parts of constant reuse:

```js
rules: {
  "no-magic/prefer-existing-constant": "warn",
  "no-magic/no-duplicate-constants": ["warn", { ignoreValues: [100] }],
}
```

`prefer-existing-constant` accepts the contract rule options. It suggests a
preceding, visible primitive string constant when the same value occurs in a
comparison, switch case, action type, or configured call. It respects lexical
shadowing and does not evaluate imports or expressions.

`no-duplicate-constants` reports repeated primitive string/number definitions in
the same lexical scope, excluding trivial values and `ignoreValues`. Separate
scopes are independent. Neither rule applies automatic fixes: equal values can
represent different business concepts. Neither infers cross-file ownership,
folder placement, deployment configuration, or whether a shared constant is safe
for client/server boundaries. Both are opt-in and absent from the recommended preset.

## Visual formatter

Consumer CLI usage:

```bash
pnpm exec eslint . --format ./node_modules/eslint-plugin-no-magic/formatter.js
```

The formatter shows severity colors, Unicode frames, numbered source excerpts,
underlined ranges, rule IDs, and a summary. Duplicate messages include the first
eligible occurrence's line and column. It uses source supplied by ESLint and does
not read other files. Long lines are clipped around the diagnostic.

For programmatic control:

```js
import { createFormatter } from "eslint-plugin-no-magic/formatter";
const format = createFormatter({ color: false, unicode: false });
console.log(format(results));
```

Color is detected from the terminal, honors `NO_COLOR` and `FORCE_COLOR`, and can
be overridden explicitly. Unicode decoration is enabled by default; the ASCII
mode disables it. Control characters are escaped to prevent terminal injection.
Terminal-specific ambiguous Unicode widths may differ. Editors and JSON formatters
still receive ordinary text messages with standard ESLint source locations.

## Prepare a local release

```bash
pnpm release:prepare
```

This checks the package version against the first changelog entry, enforces ASCII
release notes, runs frozen installation/tests/types/lint, then verifies the tarball
contains its declared exports and no unexpected private files. Output goes to
`releases/<version>-<sha256>/` so previous artifacts are preserved. The directory
is ignored by Git. It does not bump versions, change release dates, create commits
or tags, or publish. Set the intended version and write its notes before running.

### Configurable duplicate syntax exemptions

`no-duplicate-strings` accepts `ignoreSyntax`, with all categories enabled by default:

```js
createConfig({ duplicates: {
  ignoreSyntax: { jsx: false, svg: true, constDefinitions: false },
} });
```

`jsx` controls attribute values and rendered expressions outside SVG; `svg` controls
SVG markup independently; `constDefinitions` controls extracted constant values.
Setting a category to `false` includes it in duplicate counts and reports. Imports,
type declarations, directives, object keys, and property-name access stay exempt.
Behavioral contracts are still checked regardless of presentation exemptions.
These switches affect string duplication, not `no-duplicate-constants`.

### Exclude constant names

Both advisory constant rules accept `ignoreConstantNames: ["HTTP_TIMEOUT_MS"]`.
Names are exact and case-sensitive, not patterns. The duplicate-definition rule
excludes those names as both candidates and reported declarations. The reuse
rule never suggests excluded names and still respects lexical shadowing; it may
suggest another visible, non-excluded constant with the same value. These options
do not affect the independent string contract and duplicate-string rules.

Use `PreferExistingConstantOptions` or `NoDuplicateConstantsOptions` for typed
configuration. Value-level and name-level exclusions can be combined.

### Profile optional constant rules

Run `pnpm benchmark:constants` to compare parser-only, reuse-only,
duplicate-definition-only, and both optional rules on 100, 500, and 1,000
candidates. The fixtures cover hits, misses, and 20 nested scopes. Five measured
runs follow two warmups, with exact diagnostic assertions and ESLint per-rule
statistics. Results are written to `benchmarks/constants-results.json`.
See [the measured baseline](benchmarks/CONSTANTS-RESULTS.md). This command measures
existing behavior; it neither optimizes the rules nor sets a timing gate.

### Reuse regression profiles

The constant benchmark also covers many constants with the same value,
matching candidates shadowed by parameters, and fully shadowed misses.
`pnpm benchmark:constants --baseline` records `constants-before.json`;
`pnpm benchmark:constants --compare` records current results and requires identical
complete diagnostics (including messages, locations, severity, and order) across
all recorded scenarios. Capture a new baseline only when the reference behavior
is intentionally changed. Profiling still uses five samples after two warmups.

`prefer-existing-constant` uses file-local scope/value indexes and cached visible
candidates. Temporal availability, declaration preference, name exclusions, and
shadowing remain unchanged. See [before/after results](benchmarks/CONSTANTS-RESULTS.md)
for measurements and complete diagnostic-equivalence checks.

### Advisory rules through createConfig

```js
createConfig({
  contracts: { sinks: ["send"] },
  reuse: { severity: "warn", ignoreConstantNames: ["LOCAL_VALUE"] },
  constantDuplicates: { severity: "warn", ignoreValues: [100] },
});
```

Both advisory options default to `false`. `true` enables a rule with warning
severity. An object enables it with options and an optional severity. Reuse
inherits contract settings, including sinks and ignored strings, without duplicate
configuration. Its own options are severity and excluded names. Constant-definition
duplication has independent value and name exclusions. Input options are copied.
