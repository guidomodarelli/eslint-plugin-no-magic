/** Validates typed public configuration as consumed by an ESLint project. @module consumer */
import type { Linter } from "eslint";
import plugin, { recommendedMagicNumberOptions, type NoMagicStringsOptions } from "eslint-plugin-no-magic";

/** Consumer options use the exported contract without casts. */
const options: NoMagicStringsOptions = {
  sinks: ["track", { callee: "router.push", argumentIndex: 0 }],
  minDuplicates: 3,
};

/** The public preset composes with native ESLint flat configuration. */
export const config: Linter.Config[] = [
  ...plugin.configs.recommended,
  {
    plugins: { "no-magic": plugin },
    rules: {
      "no-magic/no-magic-strings": ["error", options],
      "no-magic-numbers": ["error", recommendedMagicNumberOptions],
    },
  },
];

// @ts-expect-error Argument positions must be numeric.
const invalidSink: NoMagicStringsOptions = { sinks: [{ callee: "track", argumentIndex: "first" }] };
void invalidSink;
