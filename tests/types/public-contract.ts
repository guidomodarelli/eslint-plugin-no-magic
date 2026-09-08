/** @module public-contract Exercises accepted and rejected consumer-facing TypeScript contracts. */
import type { ESLint, Linter, Rule } from "eslint";
import plugin, {
  createConfig,
  type CreateConfigOptions,
  type NoDuplicateConstantsOptions,
  type NoDuplicateStringsOptions,
  type PreferExistingConstantOptions,
  type SinkDescriptor,
} from "eslint-plugin-no-magic";
import formatter, { createFormatter, type FormatterOptions } from "eslint-plugin-no-magic/formatter";
// @ts-expect-error The combined rule option type was removed in the major release.
import type { NoMagicStringsOptions } from "eslint-plugin-no-magic";

/** Complete public options compose with native ESLint types. */
export const settings: CreateConfigOptions = {
  files: ["src/**/*.js"], contracts: { sinks: [{ callee: "client.send", argumentIndex: 1 }] },
  contractSeverity: 2, duplicateSeverity: "off",
  duplicates: { minDuplicates: 2, ignoreSyntax: { svg: false }, ignoreContracts: true },
  reuse: { severity: "warn", ignoreConstantNames: ["LOCAL"] },
  constantDuplicates: { severity: 1, ignoreValues: [100, "external"] },
};
export const config: Linter.Config[] = createConfig(settings);
export const eslintPlugin: ESLint.Plugin = plugin;
export const rule: Rule.RuleModule = plugin.rules["prefer-existing-constant"];
export const output: string = formatter([]);
export const plain: string = createFormatter({ color: false, hyperlinks: false, unicode: false })([]);
export const editor: FormatterOptions = { linkTarget: "vscode", hyperlinks: true };

// @ts-expect-error Unknown rule names must not silently receive an index-signature type.
plugin.rules["nonexistent-rule"];
// @ts-expect-error Unknown helper options are invalid.
createConfig({ unknown: true });
// @ts-expect-error Severity names must match ESLint's public severity vocabulary.
createConfig({ contractSeverity: "warning" });
// @ts-expect-error Invalid numeric severities are rejected.
createConfig({ duplicateSeverity: 3 });
// @ts-expect-error Files must be an array.
createConfig({ files: "src/**/*.js" });
// @ts-expect-error Duplicate helper options cannot independently redefine shared contracts.
createConfig({ duplicates: { contractOptions: {} } });
// @ts-expect-error Reuse inherits sinks from shared contracts.
createConfig({ reuse: { sinks: ["send"] } });
// @ts-expect-error An advisory severity is not a boolean.
createConfig({ reuse: { severity: false } });
// @ts-expect-error Names must be strings.
createConfig({ constantDuplicates: { ignoreConstantNames: [10] } });
// @ts-expect-error A descriptor requires its argument index.
export const missingArgument: SinkDescriptor = { callee: "send" };
// @ts-expect-error A descriptor's argument index must be numeric.
export const stringArgument: SinkDescriptor = { callee: "send", argumentIndex: "1" };
// @ts-expect-error Duplication thresholds must be numeric.
export const threshold: NoDuplicateStringsOptions = { minDuplicates: "3" };
// @ts-expect-error Syntax switches must be boolean.
export const syntax: NoDuplicateStringsOptions = { ignoreSyntax: { jsx: "false" } };
// @ts-expect-error Reuse has no duplicate threshold.
export const reuse: PreferExistingConstantOptions = { minDuplicates: 2 };
// @ts-expect-error Ignored primitive values cannot contain objects.
export const definitions: NoDuplicateConstantsOptions = { ignoreValues: [{}] };
// @ts-expect-error Color is an explicit boolean, not a string.
createFormatter({ color: "always" });
// @ts-expect-error Navigation targets are constrained.
createFormatter({ linkTarget: "browser" });
