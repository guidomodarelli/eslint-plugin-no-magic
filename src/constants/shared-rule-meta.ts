/** @module constants/shared-rule-meta Defines rule metadata shared by independent rules. */
import type { JSONSchema } from "@typescript-eslint/utils";

/** Exact, case-sensitive constant names excluded as suggestions or diagnostics. */
export const IGNORE_CONSTANT_NAMES_SCHEMA: JSONSchema.JSONSchema4 = {
  type: "array", items: { type: "string" }, uniqueItems: true,
};
