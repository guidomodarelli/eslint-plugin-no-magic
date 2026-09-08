/** Provides public plugin configuration and rule option contracts. @module eslint-plugin-no-magic */
import type { ESLint, Linter, Rule } from "eslint";

/** Selects a method name or static callee path and its zero-based argument. */
export interface SinkDescriptor {
  callee: string;
  argumentIndex: number;
}

/** Configures runtime string contract detection. */
export interface NoMagicContractsOptions {
  sinks?: Array<string | SinkDescriptor>;
  actionTypeCallees?: string[];
  actionTypeProperty?: string;
  ignoreStrings?: string[];
}

/** Configures duplicate detection independently from contract rules. */
export interface NoDuplicateStringsOptions {
  /** Defaults to true per category; JSX excludes SVG, which has its own switch. */
  ignoreSyntax?: { jsx?: boolean; svg?: boolean; constDefinitions?: boolean };
  /** Zero disables duplication; positive integers set the occurrence threshold. */
  minDuplicates?: number;
  ignoreStrings?: string[];
  /** Omit duplicate reports on contract positions while retaining their count. Defaults to true. */
  ignoreContracts?: boolean;
  /** Match the custom classification used by the contract rule. */
  contractOptions?: NoMagicContractsOptions;
}

/** Configures advisory detection of repeated primitive definitions. */
export interface NoDuplicateConstantsOptions { ignoreValues?: Array<string | number>; }

/** Defines shared contracts and independently configurable policies. */
export interface CreateConfigOptions {
  contracts?: NoMagicContractsOptions;
  duplicates?: Omit<NoDuplicateStringsOptions, "contractOptions">;
  contractSeverity?: Linter.Severity | Linter.StringSeverity;
  duplicateSeverity?: Linter.Severity | Linter.StringSeverity;
  files?: string[];
}

/** Builds a flat config with synchronized contract definitions and independent policies. */
export function createConfig(settings?: CreateConfigOptions): Linter.Config[];

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
    "no-magic-contracts": Rule.RuleModule;
    "no-duplicate-strings": Rule.RuleModule;
    "prefer-existing-constant": Rule.RuleModule;
    "no-duplicate-constants": Rule.RuleModule;
  };
  configs: { recommended: Linter.Config[] };
};

export default plugin;
