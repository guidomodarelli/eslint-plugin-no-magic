/**
 * @fileoverview eslint-plugin-no-magic entrypoint.
 *
 * Ships the `no-magic-strings` rule. Magic numbers are intentionally NOT
 * re-implemented here: use the upstream `@typescript-eslint/no-magic-numbers`
 * rule directly, configured with `recommendedMagicNumberOptions` for parity
 * with this plugin's defaults.
 */

import { createRequire } from "node:module";

import noMagicStrings, { createFocusedStringRule } from "./rules/no-magic-strings.js";

/**
 * Sensible defaults for `@typescript-eslint/no-magic-numbers`. Consumers wire
 * the upstream rule themselves to avoid registering the typescript-eslint
 * plugin twice (it usually already ships through their TypeScript config).
 */
export const recommendedMagicNumberOptions = {
  ignore: [-1, 0, 1],
  enforceConst: true,
  ignoreEnums: true,
  ignoreNumericLiteralTypes: true,
  ignoreReadonlyClassProperties: true,
  ignoreArrayIndexes: true,
  ignoreDefaultValues: true,
};

/** Package metadata is the canonical source for the public plugin version. */
const packageMetadata = createRequire(import.meta.url)("./package.json");

/** Exposes rules and flat configuration to ESLint consumers. */
const plugin = {
  meta: {
    name: "eslint-plugin-no-magic",
    version: packageMetadata.version,
  },
  rules: {
    "no-magic-strings": noMagicStrings,
    "no-magic-contracts": createFocusedStringRule("contracts"),
    "no-duplicate-strings": createFocusedStringRule("duplicates"),
  },
  configs: {},
};

/**
 * Flat config that reports contracts as errors and duplicates as warnings. Spread it into
 * an ESLint flat config array. Add `@typescript-eslint/no-magic-numbers` with
 * `recommendedMagicNumberOptions` separately to also cover magic numbers.
 */
plugin.configs.recommended = [
  {
    plugins: {
      "no-magic": plugin,
    },
    rules: {
      "no-magic/no-magic-contracts": "error",
      "no-magic/no-duplicate-strings": "warn",
    },
  },
];

export default plugin;
