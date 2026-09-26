/** @module constants/string-analysis/rule-meta Defines reporting responsibilities, message identifiers, and option schemas of string rules. */
import type { JSONSchema } from "@typescript-eslint/utils";

/** Reporting responsibility bound to each public string rule. */
export const DETECTIONS = {
  contracts: "contracts",
  duplicates: "duplicates",
  reuse: "reuse",
} as const;

/** Diagnostic message identifiers shared by the string rules. */
export const STRING_MESSAGE_IDS = {
  existingConstant: "existingConstant",
  noMagicString: "noMagicString",
  duplicateString: "duplicateString",
} as const;

/** Shared schema properties are narrowed for each public rule. */
export const RULE_OPTION_PROPERTIES: Readonly<Record<string, JSONSchema.JSONSchema4>> = {
  sinks: {
    type: "array",
    items: {
      anyOf: [
        { type: "string" },
        {
          type: "object",
          properties: {
            callee: { type: "string", minLength: 1 },
            argumentIndex: { type: "integer", minimum: 0 },
          },
          required: ["callee", "argumentIndex"],
          additionalProperties: false,
        },
      ],
    },
  },
  actionTypeCallees: {
    type: "array",
    items: { type: "string" },
  },
  actionTypeProperty: {
    type: "string",
  },
  minDuplicates: {
    type: "integer",
    minimum: 0,
  },
  ignoreStrings: {
    type: "array",
    items: { type: "string" },
  },
  structuralDiscriminants: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
  },
};

/** Independent syntax exemptions accepted by the duplicate rule. */
export const IGNORE_SYNTAX_SCHEMA: JSONSchema.JSONSchema4 = {
  type: "object",
  properties: { jsx: { type: "boolean" }, svg: { type: "boolean" }, constDefinitions: { type: "boolean" } },
  additionalProperties: false,
};

/** Toggle that omits duplicate reports on contract positions. */
export const IGNORE_CONTRACTS_SCHEMA: JSONSchema.JSONSchema4 = { type: "boolean" };
