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

/** Package metadata is the canonical source for the public plugin version. */
const packageMetadata: { version: string } = createRequire(import.meta.url)("../package.json");

/** Exposes rules and flat configuration to ESLint consumers. */
type RuleName = "no-magic-contracts" | "no-duplicate-strings" | "prefer-existing-constant" | "no-duplicate-constants";
/** Keeps generated public declarations independent of parser implementation types. */
const plugin: { meta: { name: string; version: string }; rules: Record<RuleName, Rule.RuleModule>; configs: { recommended: Linter.Config[] } } = {
  meta: {
    name: "eslint-plugin-no-magic",
    version: packageMetadata.version,
  },
  rules: {
    "no-magic-contracts": toESLintRule(createFocusedStringRule("contracts")),
    "no-duplicate-strings": toESLintRule(createFocusedStringRule("duplicates")),
    "prefer-existing-constant": toESLintRule(createFocusedStringRule("reuse")),
    "no-duplicate-constants": toESLintRule(noDuplicateConstants),
  },
  configs: { recommended: [] },
} satisfies ESLint.Plugin;

/** Public documentation root shared by all registered rule metadata. */
const RULE_DOCUMENTATION_BASE_URL = "https://github.com/guidomodarelli/eslint-plugin-no-magic/blob/main/docs/rules";
for (const [name, rule] of Object.entries(plugin.rules)) {
  rule.meta!.docs!.url = `${RULE_DOCUMENTATION_BASE_URL}/${name}.md`;
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
  const allowedKeys = ["contracts", "duplicates", "contractSeverity", "duplicateSeverity", "files", "reuse", "constantDuplicates"];
  for (const key of Object.keys(settings)) {
    if (!allowedKeys.includes(key)) throw new TypeError(`createConfig: unsupported option ${key}`);
  }
  const { contracts = {}, duplicates = {}, contractSeverity = "error", duplicateSeverity = "warn", files } = settings;
  const severities = [0, 1, 2, "off", "warn", "error"];
  if (!severities.includes(contractSeverity) || !severities.includes(duplicateSeverity)) {
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
    if (value === false) return { [ruleName]: "off" };
    if (value !== true && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new TypeError(`createConfig: ${name} must be a boolean or options object`);
    }
    const { severity = "warn", ...options } = value === true ? {} : value;
    if (!severities.includes(severity)) throw new TypeError(`createConfig: invalid ${name} severity`);
    const allowed = name === "reuse" ? ["ignoreConstantNames"] : ["ignoreConstantNames", "ignoreValues"];
    for (const key of Object.keys(options)) {
      if (!allowed.includes(key)) throw new TypeError(`createConfig: unsupported ${name} option ${key}`);
    }
    return { [ruleName]: [severity, JSON.parse(JSON.stringify({ ...inherited, ...options }))] };
  }
  return [{
    ...(files === undefined ? {} : { files: [...files] }),
    plugins: { "no-magic": plugin },
    rules: {
      ...advisory("reuse", "no-magic/prefer-existing-constant", contractOptions),
      ...advisory("constantDuplicates", "no-magic/no-duplicate-constants"),
      "no-magic/no-magic-contracts": [contractSeverity, contractOptions],
      "no-magic/no-duplicate-strings": [duplicateSeverity, {
        ignoreStrings: [...(contractOptions.ignoreStrings ?? [])],
        ignoreContracts: contractSeverity !== "off" && contractSeverity !== 0,
        ...duplicateOptions,
        contractOptions: JSON.parse(JSON.stringify(contractOptions)),
      }],
    },
  }];
}

/** Recommended policies share a single contract definition. */
plugin.configs.recommended = createConfig();

export default plugin;
