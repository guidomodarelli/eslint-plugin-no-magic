/** Validates typed public configuration as consumed by an ESLint project. @module consumer */
import type { Linter } from "eslint";
import formatter from "eslint-plugin-no-magic/formatter";
import plugin, { createConfig, recommendedMagicNumberOptions, type NoMagicContractsOptions, type NoDuplicateStringsOptions, type PreferExistingConstantOptions, type NoDuplicateConstantsOptions } from "eslint-plugin-no-magic";

/** Consumer options use the exported contract without casts. */
const options: NoMagicContractsOptions = {
  sinks: ["track", { callee: "router.push", argumentIndex: 0 }],
};

/** The public preset composes with native ESLint flat configuration. */
export const config: Linter.Config[] = [
  {
    plugins: { "no-magic": plugin },
    rules: {
      "no-magic/no-magic-contracts": ["error", options],
      "no-magic-numbers": ["error", recommendedMagicNumberOptions],
    },
  },
];

// @ts-expect-error Argument positions must be numeric.
const invalidSink: NoMagicContractsOptions = { sinks: [{ callee: "track", argumentIndex: "first" }] };
void invalidSink;

/** Independent rules expose options without unrelated policy fields. */
export const contractOptions: NoMagicContractsOptions = { sinks: ["track"] };
export const duplicateOptions: NoDuplicateStringsOptions = { minDuplicates: 4, ignoreContracts: true, contractOptions };
// @ts-expect-error Contract rules do not accept duplicate thresholds.
const invalidContract: NoMagicContractsOptions = { minDuplicates: 3 };
// @ts-expect-error Duplicate rules do not accept sink configuration.
const invalidDuplicate: NoDuplicateStringsOptions = { sinks: ["track"] };
void invalidContract;
void invalidDuplicate;

export const sharedConfig: Linter.Config[] = createConfig({ contracts: contractOptions, duplicates: { minDuplicates: 3 } });
void formatter;

/** Name exclusions are supported by both optional constant rules. */
export const reuseOptions: PreferExistingConstantOptions = { ignoreConstantNames: ["LOCAL_TIMEOUT"] };
export const definitionOptions: NoDuplicateConstantsOptions = { ignoreConstantNames: ["LOCAL_TIMEOUT"], ignoreValues: [100] };
