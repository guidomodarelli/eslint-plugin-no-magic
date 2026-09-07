/** Provides public plugin configuration and rule option contracts. @module eslint-plugin-no-magic */
import type { ESLint, Linter, Rule } from "eslint";

/** Selects a method name or static callee path and its zero-based argument. */
export interface SinkDescriptor {
  callee: string;
  argumentIndex: number;
}

/** Configures behavioral string detection and duplicate reporting. */
export interface NoMagicStringsOptions {
  sinks?: Array<string | SinkDescriptor>;
  actionTypeCallees?: string[];
  actionTypeProperty?: string;
  /** Zero disables duplication; positive values set the occurrence threshold. */
  minDuplicates?: number;
  ignoreStrings?: string[];
}

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
  rules: { "no-magic-strings": Rule.RuleModule };
  configs: { recommended: Linter.Config[] };
};

export default plugin;
