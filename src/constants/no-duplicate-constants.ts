/** @module constants/no-duplicate-constants Defines diagnostics, schema, and exemptions of repeated primitive definitions. */
import type { JSONSchema } from "@typescript-eslint/utils";
import { IGNORE_CONSTANT_NAMES_SCHEMA } from "./shared-rule-meta.js";

/** Diagnostic reported for a repeated primitive definition. */
export const DUPLICATE_CONSTANT_MESSAGE_ID = "duplicateConstant" as const;

/** Common mechanical values are not actionable extraction candidates. */
export const TRIVIAL_VALUES: ReadonlySet<string | number | boolean> = new Set(["", true, false, 0, 1, -1]);

/** Option schema of the advisory rule. */
export const NO_DUPLICATE_CONSTANTS_SCHEMA: JSONSchema.JSONSchema4[] = [{
  type: "object",
  properties: { ignoreConstantNames: IGNORE_CONSTANT_NAMES_SCHEMA, ignoreValues: { type: "array", items: { type: ["string", "number"] } } },
  additionalProperties: false,
}];
