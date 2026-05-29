/**
 * @fileoverview eslint-plugin-no-magic entrypoint.
 *
 * Ships the `no-magic-strings` rule. Magic numbers are intentionally NOT
 * re-implemented here: use the upstream `@typescript-eslint/no-magic-numbers`
 * rule directly, configured with `recommendedMagicNumberOptions` for parity
 * with this plugin's defaults.
 */

import noMagicStrings from "./rules/no-magic-strings.js";

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

const plugin = {
  meta: {
    name: "eslint-plugin-no-magic",
    version: "0.1.0",
  },
  rules: {
    "no-magic-strings": noMagicStrings,
  },
  configs: {},
};

/**
 * Flat config that enables `no-magic-strings` with its defaults. Spread it into
 * an ESLint flat config array. Add `@typescript-eslint/no-magic-numbers` with
 * `recommendedMagicNumberOptions` separately to also cover magic numbers.
 */
plugin.configs.recommended = [
  {
    plugins: {
      "no-magic": plugin,
    },
    rules: {
      "no-magic/no-magic-strings": "error",
    },
  },
];

export default plugin;
