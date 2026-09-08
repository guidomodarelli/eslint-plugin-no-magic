/** @module rule-adapter Exposes parser-aware implementations through ESLint's public plugin contract. */
import type { Rule } from "eslint";
import type { TSESLint } from "@typescript-eslint/utils";

/**
 * Adapts the typescript-eslint node superset to ESLint's runtime-compatible interface.
 * @param rule - Rule verified against both native JavaScript and TypeScript parsers.
 * @returns The same rule object, with ESLint's consumer-facing declaration type.
 */
export function toESLintRule<MessageIds extends string, Options extends readonly unknown[]>(rule: TSESLint.RuleModule<MessageIds, Options>): Rule.RuleModule {
  return rule as unknown as Rule.RuleModule;
}
