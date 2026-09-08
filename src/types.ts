/** Provides public plugin configuration and rule option contracts. @module eslint-plugin-no-magic */
import type { Linter } from "eslint";

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
export interface NoDuplicateConstantsOptions {
  ignoreValues?: Array<string | number>;
  /** Exact, case-sensitive names excluded as both candidates and diagnostics. */
  ignoreConstantNames?: string[];
}

/** Configures optional string-constant reuse suggestions. */
export interface PreferExistingConstantOptions extends NoMagicContractsOptions {
  /** Exact, case-sensitive names that must not be suggested. */
  ignoreConstantNames?: string[];
}

/** Defines shared contracts and independently configurable policies. */
export interface CreateConfigOptions {
  contracts?: NoMagicContractsOptions;
  duplicates?: Omit<NoDuplicateStringsOptions, "contractOptions">;
  contractSeverity?: Linter.Severity | Linter.StringSeverity;
  duplicateSeverity?: Linter.Severity | Linter.StringSeverity;
  files?: string[];
  /** Opt-in reuse suggestions inherit contracts; defaults to off, enabled severity defaults to warn. */
  reuse?: boolean | { severity?: Linter.Severity | Linter.StringSeverity; ignoreConstantNames?: string[] };
  /** Opt-in definition duplication; defaults to off, enabled severity defaults to warn. */
  constantDuplicates?: boolean | (NoDuplicateConstantsOptions & { severity?: Linter.Severity | Linter.StringSeverity });
}

