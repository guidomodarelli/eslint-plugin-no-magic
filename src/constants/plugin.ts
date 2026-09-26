/** @module constants/plugin Defines plugin identity, registered rule names, and flat-config helper vocabulary. */
import type { Linter } from "eslint";
import type { CreateConfigOptions } from "../types.js";

/** Public package name reported in plugin metadata. */
export const PLUGIN_NAME = "eslint-plugin-no-magic";
/** Namespace under which flat configuration registers the plugin. */
export const PLUGIN_NAMESPACE = "no-magic";
/** Package manifest path, relative to the compiled entrypoint module. */
export const PACKAGE_MANIFEST_SPECIFIER = "../package.json";

/** Registered rule identifiers; each has a matching documentation page. */
export const RULE_NAMES = {
  noMagicContracts: "no-magic-contracts",
  noDuplicateStrings: "no-duplicate-strings",
  preferExistingConstant: "prefer-existing-constant",
  noDuplicateConstants: "no-duplicate-constants",
} as const;

/** Rule identifiers qualified with the plugin namespace for flat configuration. */
export const QUALIFIED_RULE_NAMES = {
  noMagicContracts: `${PLUGIN_NAMESPACE}/${RULE_NAMES.noMagicContracts}`,
  noDuplicateStrings: `${PLUGIN_NAMESPACE}/${RULE_NAMES.noDuplicateStrings}`,
  preferExistingConstant: `${PLUGIN_NAMESPACE}/${RULE_NAMES.preferExistingConstant}`,
  noDuplicateConstants: `${PLUGIN_NAMESPACE}/${RULE_NAMES.noDuplicateConstants}`,
} as const;

/** Public documentation root shared by all registered rule metadata. */
export const RULE_DOCUMENTATION_BASE_URL = "https://github.com/guidomodarelli/eslint-plugin-no-magic/blob/main/docs/rules";
/** Extension of each rule documentation page. */
export const RULE_DOCUMENTATION_EXTENSION = ".md";

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

/** Top-level `createConfig` options; unknown keys are rejected. */
export const CREATE_CONFIG_OPTION_KEYS: readonly string[] = [
  "contracts", "duplicates", "contractSeverity", "duplicateSeverity", "files", "reuse", "constantDuplicates",
] satisfies readonly (keyof CreateConfigOptions)[];

/** ESLint's numeric and named severity vocabulary. */
export const RULE_SEVERITIES: readonly (Linter.Severity | Linter.StringSeverity)[] = [0, 1, 2, "off", "warn", "error"];
/** Severities that disable a rule. */
export const DISABLED_SEVERITY_NAME = "off" as const;
export const DISABLED_SEVERITY_LEVEL = 0 as const;

/** Default severity of contract diagnostics. */
export const DEFAULT_CONTRACT_SEVERITY = "error" as const;
/** Default severity of duplicate diagnostics and enabled advisory rules. */
export const DEFAULT_DUPLICATE_SEVERITY = "warn" as const;
export const DEFAULT_ADVISORY_SEVERITY = "warn" as const;

/** Options each advisory helper accepts besides its severity. */
export const ADVISORY_OPTION_KEYS: Readonly<Record<"reuse" | "constantDuplicates", readonly string[]>> = {
  reuse: ["ignoreConstantNames"],
  constantDuplicates: ["ignoreConstantNames", "ignoreValues"],
};
