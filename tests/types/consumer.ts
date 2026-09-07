/** Validates typed public configuration as consumed by an ESLint project. @module consumer */
import type { Linter } from "eslint";
import plugin, { recommendedMagicNumberOptions, type NoMagicContractsOptions, type NoDuplicateStringsOptions, type NoMagicStringsOptions } from "eslint-plugin-no-magic";

/** Consumer options use the exported contract without casts. */
const options: NoMagicStringsOptions = {
  sinks: ["track", { callee: "router.push", argumentIndex: 0 }],
  minDuplicates: 3,
};

/** The public preset composes with native ESLint flat configuration. */
export const config: Linter.Config[] = [
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

/** Independent rules expose options without unrelated policy fields. */
export const contractOptions: NoMagicContractsOptions = { sinks: ["track"] };
export const duplicateOptions: NoDuplicateStringsOptions = { minDuplicates: 4 };
// @ts-expect-error Contract rules do not accept duplicate thresholds.
const invalidContract: NoMagicContractsOptions = { minDuplicates: 3 };
// @ts-expect-error Duplicate rules do not accept sink configuration.
const invalidDuplicate: NoDuplicateStringsOptions = { sinks: ["track"] };
void invalidContract;
void invalidDuplicate;
