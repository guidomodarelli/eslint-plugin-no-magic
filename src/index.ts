/**
 * @fileoverview eslint-plugin-no-magic entrypoint.
 *
 * Ships independent contract and duplicate string rules. Magic numbers are intentionally NOT
 * re-implemented here: use the upstream `@typescript-eslint/no-magic-numbers`
 * rule directly, configured with `recommendedMagicNumberOptions` for parity
 * with this plugin's defaults.
 */

import type { ESLint, Linter, Rule } from "eslint";
import type { CreateConfigOptions, NoMagicContractsOptions, NoDuplicateStringsOptions } from "./types.js";
import { toESLintRule } from "./rule-adapter.js";
export type * from "./types.js";

import { createRequire } from "node:module";

import noDuplicateConstants from "./rules/no-duplicate-constants.js";

import { createFocusedStringRule } from "./rules/string-analysis.js";
import { DETECTIONS } from "./constants/string-analysis/index.js";
import {
  ADVISORY_OPTION_KEYS,
  CREATE_CONFIG_OPTION_KEYS,
  DEFAULT_ADVISORY_SEVERITY,
  DEFAULT_CONTRACT_SEVERITY,
  DEFAULT_DUPLICATE_SEVERITY,
  DISABLED_SEVERITY_LEVEL,
  DISABLED_SEVERITY_NAME,
  PACKAGE_MANIFEST_SPECIFIER,
  PLUGIN_NAME,
  PLUGIN_NAMESPACE,
  QUALIFIED_RULE_NAMES,
  RULE_DOCUMENTATION_BASE_URL,
  RULE_DOCUMENTATION_EXTENSION,
  RULE_NAMES,
  RULE_SEVERITIES,
} from "./constants/plugin.js";
export { recommendedMagicNumberOptions } from "./constants/plugin.js";

/** Package metadata is the canonical source for the public plugin version. */
const packageMetadata: { version: string } = createRequire(import.meta.url)(PACKAGE_MANIFEST_SPECIFIER);

/** Exposes rules and flat configuration to ESLint consumers. */
type RuleName = "no-magic-contracts" | "no-duplicate-strings" | "prefer-existing-constant" | "no-duplicate-constants";
/** Keeps generated public declarations independent of parser implementation types. */
const plugin: { meta: { name: string; version: string }; rules: Record<RuleName, Rule.RuleModule>; configs: { recommended: Linter.Config[] } } = {
  meta: {
    name: PLUGIN_NAME,
    version: packageMetadata.version,
  },
  rules: {
    [RULE_NAMES.noMagicContracts]: toESLintRule(createFocusedStringRule(DETECTIONS.contracts)),
    [RULE_NAMES.noDuplicateStrings]: toESLintRule(createFocusedStringRule(DETECTIONS.duplicates)),
    [RULE_NAMES.preferExistingConstant]: toESLintRule(createFocusedStringRule(DETECTIONS.reuse)),
    [RULE_NAMES.noDuplicateConstants]: toESLintRule(noDuplicateConstants),
  },
  configs: { recommended: [] },
} satisfies ESLint.Plugin;

for (const [name, rule] of Object.entries(plugin.rules)) {
  rule.meta!.docs!.url = `${RULE_DOCUMENTATION_BASE_URL}/${name}${RULE_DOCUMENTATION_EXTENSION}`;
}

/**
 * Builds independent rule configuration from one shared contract definition.
 * @param settings - Contracts, duplicate policy, severities, and optional file globs.
 * @returns ESLint flat configuration with isolated option copies.
 * @throws TypeError - When configuration contains unsupported top-level keys or severities.
 */
export function createConfig(settings: CreateConfigOptions = {}): Linter.Config[] {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new TypeError("createConfig: settings must be an object");
  }
  for (const key of Object.keys(settings)) {
    if (!CREATE_CONFIG_OPTION_KEYS.includes(key)) throw new TypeError(`createConfig: unsupported option ${key}`);
  }
  const { contracts = {}, duplicates = {}, contractSeverity = DEFAULT_CONTRACT_SEVERITY, duplicateSeverity = DEFAULT_DUPLICATE_SEVERITY, files } = settings;
  if (!RULE_SEVERITIES.includes(contractSeverity) || !RULE_SEVERITIES.includes(duplicateSeverity)) {
    throw new TypeError("createConfig: severity must be off, warn, error, 0, 1, or 2");
  }
  for (const [name, value] of [["contracts", contracts], ["duplicates", duplicates]]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`createConfig: ${name} must be an object`);
  }
  if ("contractOptions" in duplicates) throw new TypeError("createConfig: define contract options once in contracts");
  if (files !== undefined && (!Array.isArray(files) || files.some((pattern) => typeof pattern !== "string"))) {
    throw new TypeError("createConfig: files must be an array of glob strings");
  }
  const contractOptions: NoMagicContractsOptions = JSON.parse(JSON.stringify(contracts));
  const duplicateOptions: Omit<NoDuplicateStringsOptions, "contractOptions"> = JSON.parse(JSON.stringify(duplicates));
  /**
   * Builds an opt-in advisory rule entry while preserving shared contract options.
   * @param name - Public helper option name.
   * @param ruleName - Registered rule identifier.
   * @param inherited - Shared options for this rule.
   * @returns Rule entry or an empty object when disabled.
   * @throws TypeError - When an advisory configuration or severity is invalid.
   */
  function advisory(name: "reuse" | "constantDuplicates", ruleName: string, inherited: object = {}): Linter.RulesRecord {
    const value = settings[name];
    if (value === undefined) return {};
    if (value === false) return { [ruleName]: DISABLED_SEVERITY_NAME };
    if (value !== true && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new TypeError(`createConfig: ${name} must be a boolean or options object`);
    }
    const { severity = DEFAULT_ADVISORY_SEVERITY, ...options } = value === true ? {} : value;
    if (!RULE_SEVERITIES.includes(severity)) throw new TypeError(`createConfig: invalid ${name} severity`);
    for (const key of Object.keys(options)) {
      if (!ADVISORY_OPTION_KEYS[name].includes(key)) throw new TypeError(`createConfig: unsupported ${name} option ${key}`);
    }
    return { [ruleName]: [severity, JSON.parse(JSON.stringify({ ...inherited, ...options }))] };
  }
  return [{
    ...(files === undefined ? {} : { files: [...files] }),
    plugins: { [PLUGIN_NAMESPACE]: plugin },
    rules: {
      ...advisory("reuse", QUALIFIED_RULE_NAMES.preferExistingConstant, contractOptions),
      ...advisory("constantDuplicates", QUALIFIED_RULE_NAMES.noDuplicateConstants),
      [QUALIFIED_RULE_NAMES.noMagicContracts]: [contractSeverity, contractOptions],
      [QUALIFIED_RULE_NAMES.noDuplicateStrings]: [duplicateSeverity, {
        ignoreStrings: [...(contractOptions.ignoreStrings ?? [])],
        ignoreContracts: contractSeverity !== DISABLED_SEVERITY_NAME && contractSeverity !== DISABLED_SEVERITY_LEVEL,
        ...duplicateOptions,
        contractOptions: JSON.parse(JSON.stringify(contractOptions)),
      }],
    },
  }];
}

/** Recommended policies share a single contract definition. */
plugin.configs.recommended = createConfig();

export default plugin;
