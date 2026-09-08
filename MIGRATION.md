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

## Configuration for 1.0.0

```js
import noMagic from "eslint-plugin-no-magic";

const contractOptions = { sinks: ["track"], ignoreStrings: ["legacy"] };
export default [
  {
    plugins: { "no-magic": noMagic },
    rules: {
      "no-magic/no-magic-contracts": ["error", contractOptions],
      "no-magic/no-duplicate-strings": ["error", {
        minDuplicates: 3,
        ignoreStrings: contractOptions.ignoreStrings,
        ignoreContracts: true,
        contractOptions,
      }],
    },
  },
];
```

The former `NoMagicStringsOptions` type is also removed. Use
`NoMagicContractsOptions` and `NoDuplicateStringsOptions`. The default export,
recommended preset, and `recommendedMagicNumberOptions` remain available.
The preset reports contracts as errors and duplicates as warnings.

The duplicate rule accepts `minDuplicates`, `ignoreStrings`, `ignoreContracts`,
and `contractOptions`. Contract classification is independent of enabled rules:
set `ignoreContracts: false` when you want duplicate reports on contract positions.

Version 1.0.0 does not register a legacy alias or ship the old rule module.
ESLint rejects configurations that still enable `no-magic/no-magic-strings`.

## Toolchain

Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm lint`, and
`pnpm typecheck`. TypeScript 7 runs `tsc`; the TS6 compatibility package supplies
the API required by typescript-eslint. No mocks replace the parser.

## Agnostic rules and shared configuration

Package-specific exemptions (including the former next/font exemption) are gone.
Repeated values in those calls now follow the same rules as any other library.
Use an explicit `ignoreStrings` allowlist if needed for your project.

Prefer `createConfig({ contracts, duplicates })` to manually duplicating contract
options. Optional constant rules and the terminal formatter require explicit opt-in.
