# Deprecation in 0.2.2 and removal in 1.0.0

Version 0.2.2 keeps `no-magic-strings` working but exposes its deprecation through
ESLint metadata and TypeScript documentation. Version 1.0.0 removes it.

Replace the combined rule with both independent rules. Copy `sinks`,
`actionTypeCallees`, `actionTypeProperty`, and `ignoreStrings` into the contract
rule. Copy `minDuplicates` and `ignoreStrings` into the duplicate rule, and pass
the contract options as `contractOptions`. Use the same severity on both rules
to preserve the previous severity. Set `ignoreContracts: true` to keep one report
per contract position. Remove old rule entries, including disable comments.

# Migrating from 0.1.x to 0.2.0

Use Node `^26.0.0` and ESLint
`^10.10.0`. Repository development requires pnpm 12+.

## Recommended configuration

The recommended preset now enables `no-magic/no-magic-contracts` as an error
and `no-magic/no-duplicate-strings` as a warning. Their options and severities
are independent:

```js
export default [
  ...noMagic.configs.recommended,
  {
    rules: {
      "no-magic/no-magic-contracts": ["error", { ignoreStrings: ["legacy"] }],
      "no-magic/no-duplicate-strings": ["warn", { minDuplicates: 4 }],
    },
  },
];
```

The duplicate rule accepts `minDuplicates`, `ignoreStrings`, `ignoreContracts`,
and `contractOptions`. The contract rule accepts the combined rule's options
except `minDuplicates`. Starting with 0.2.1, `ignoreContracts` defaults to `true` in both manual
configurations and the recommended preset: contract positions contribute to duplicate counts but
do not receive a second diagnostic. Set it to `false` to restore overlap or to
report duplicate contracts after disabling the contract rule. For custom sinks,
dispatchers, or contract allowlists, pass the same configuration to the duplicate
rule's `contractOptions`. Classification does not inspect whether another rule
is enabled. To preserve combined reporting and one diagnostic per node, use only
`no-magic/no-magic-strings` with manual plugin registration.
Do not enable the combined rule alongside the recommended preset.

## Detection changes

- `router.push` and `router.replace` inspect argument 0. Configure another receiver
  explicitly; `sinks: ["push", "replace"]` restores broad method-name matching.
- Storage methods inspect only argument 0. String sink entries still inspect all
  string arguments; use descriptors to select an argument index.
- Single-character contracts, TypeScript casts, ternary routes, JSX comparisons,
  and computed static dispatch/property names now report correctly.
- Duplicate counts include eligible contract occurrences. JSX copy in value
  branches, directive prologues, and named constants remain exempt.
- Diagnostic text now names the reason; the combined rule keeps its message IDs.

## Toolchain

Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm lint`, and
`pnpm typecheck`. TypeScript 7 runs `tsc`; the TS6 compatibility package supplies
the API required by typescript-eslint. No mocks replace the parser.
