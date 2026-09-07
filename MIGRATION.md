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

The duplicate rule accepts only `minDuplicates` and `ignoreStrings`. The contract
rule accepts the combined rule's options except `minDuplicates`. When both rules
are enabled, a repeated contract can receive both diagnostics, because each rule
expresses a separate policy. To preserve combined reporting and one diagnostic
per node, use only `no-magic/no-magic-strings` with manual plugin registration.
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
