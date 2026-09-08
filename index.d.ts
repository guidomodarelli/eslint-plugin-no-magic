/** Provides public plugin configuration and rule option contracts. @module eslint-plugin-no-magic */
import type { ESLint, Linter, Rule } from "eslint";

/** Selects a method name or static callee path and its zero-based argument. */
export interface SinkDescriptor {
  callee: string;
  argumentIndex: number;
}

/** Configures behavioral string detection and duplicate reporting.
 * @deprecated Use NoMagicContractsOptions and NoDuplicateStringsOptions instead. Removed in 1.0.0.
 */
export interface NoMagicStringsOptions {
  sinks?: Array<string | SinkDescriptor>;
  actionTypeCallees?: string[];
  actionTypeProperty?: string;
  /** Zero disables duplication; positive values set the occurrence threshold. */
  minDuplicates?: number;
  ignoreStrings?: string[];
}

/** Configures contracts without duplicate thresholds. */
export type NoMagicContractsOptions = Omit<NoMagicStringsOptions, "minDuplicates">;

/** Configures duplicate detection independently from contract rules. */
export type NoDuplicateStringsOptions = Pick<NoMagicStringsOptions, "minDuplicates" | "ignoreStrings"> & {
  /** Omit duplicate reports on contract positions while retaining their count. Defaults to true. */
  ignoreContracts?: boolean;
  /** Match the custom classification used by the contract rule. */
  contractOptions?: NoMagicContractsOptions;
};

/** Exposes the recommended options for the upstream TypeScript number rule. */
export const recommendedMagicNumberOptions: {
  ignore: number[];
  enforceConst: boolean;
  ignoreEnums: boolean;
  ignoreNumericLiteralTypes: boolean;
  ignoreReadonlyClassProperties: boolean;
  ignoreArrayIndexes: boolean;
  ignoreDefaultValues: boolean;
};

/** Exposes the named rule and ready-to-use flat configuration. */
declare const plugin: ESLint.Plugin & {
  rules: {
    /** @deprecated Use the independent rules instead. Removed in 1.0.0. */
    "no-magic-strings": Rule.RuleModule;
    "no-magic-contracts": Rule.RuleModule;
    "no-duplicate-strings": Rule.RuleModule;
  };
  configs: { recommended: Linter.Config[] };
};

export default plugin;
