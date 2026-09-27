/** @module constants/require-constants-location Defines diagnostics, defaults, schema, and glob syntax of constants placement. */
import type { JSONSchema } from "@typescript-eslint/utils";
import { IGNORE_CONSTANT_NAMES_SCHEMA } from "./shared-rule-meta.js";

/** Diagnostic reported for a static constant declared outside a constants module. */
export const CONSTANT_OUTSIDE_CONSTANTS_MODULE_MESSAGE_ID = "constantOutsideConstantsModule";

/** Modules owning constants when no patterns are configured. */
export const DEFAULT_CONSTANTS_PATTERNS: readonly string[] = ["**/constants/**"];
/** Only exported constants are reported unless configured otherwise. */
export const DEFAULT_EXPORTED_ONLY = true;

/** Glob tokens translated to path-segment-aware regular expressions. */
export const GLOB_DIRECTORY_WILDCARD = "**/";
export const GLOB_RECURSIVE_WILDCARD = "**";
export const GLOB_SEGMENT_WILDCARD = "*";
export const GLOB_CHARACTER_WILDCARD = "?";
/** Regular expression fragments matching the glob tokens above. */
export const ANY_DIRECTORY_PREFIX_PATTERN = "(?:.*/)?";
export const ANY_PATH_PATTERN = ".*";
export const ANY_SEGMENT_CHARACTERS_PATTERN = "[^/]*";
export const ANY_SEGMENT_CHARACTER_PATTERN = "[^/]";
/** Characters with regular expression meaning that globs treat literally. */
export const REGEXP_SPECIAL_CHARACTER_PATTERN = /[.+^${}()|[\]\\]/u;
/** Windows path separators, normalized before matching globs. */
export const WINDOWS_PATH_SEPARATOR_PATTERN = /\\/gu;

/** Option schema of the placement rule. */
export const REQUIRE_CONSTANTS_LOCATION_SCHEMA: JSONSchema.JSONSchema4[] = [{
  type: "object",
  properties: {
    patterns: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, uniqueItems: true },
    exportedOnly: { type: "boolean" },
    ignoreConstantNames: IGNORE_CONSTANT_NAMES_SCHEMA,
  },
  additionalProperties: false,
}];
