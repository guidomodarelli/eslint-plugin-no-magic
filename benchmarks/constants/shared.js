/** @module constants/shared Defines public rule identifiers and profiles shared by benchmarks. */

/** Namespace under which benchmarks register the plugin. */
export const PLUGIN_NAMESPACE = "no-magic";
/** Public rule IDs used for configuration, statistics, and diagnostic assertions. */
export const REUSE_RULE = `${PLUGIN_NAMESPACE}/prefer-existing-constant`;
export const DUPLICATE_RULE = `${PLUGIN_NAMESPACE}/no-duplicate-constants`;

/** Profile that isolates parser cost without plugin rules. */
export const PARSER_ONLY_MODE = "parser-only";
/** Warmups reduce first-run effects; measured samples are summarized by median. */
export const WARMUP_RUNS = 2;
export const MEASURED_RUNS = 5;
