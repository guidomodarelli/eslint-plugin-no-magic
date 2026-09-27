/** @module constants/string-analysis/syntax Defines structural markup vocabulary and duplicate-detection defaults. */

/** Root SVG tag whose descendants are presentation markup. */
export const SVG_ROOT_ELEMENT_NAME = "svg" as const;

/** Structural SVG tag names whose attributes are presentation, not contracts. */
export const SVG_ELEMENT_NAMES: ReadonlySet<string> = new Set([
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "g",
  "line",
  "linearGradient",
  "path",
  "polygon",
  "polyline",
  "rect",
  "stop",
  SVG_ROOT_ELEMENT_NAME,
  "text",
  "textPath",
  "title",
  "tspan",
]);

/** Every syntax category is exempt from duplicate detection unless disabled. */
export const DEFAULT_IGNORE_SYNTAX = { jsx: true, svg: true, constDefinitions: true } as const;

/** Occurrences required before a repeated string is reported. */
export const DEFAULT_MIN_DUPLICATES = 3;
/** Strings of this length or shorter are exempt from duplicate detection. */
export const SINGLE_CHARACTER_LENGTH = 1;
/** Maximum literal preview length in diagnostic messages. */
export const DIAGNOSTIC_PREVIEW_LENGTH = 80;
