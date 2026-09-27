/** @module constants/constants-benchmark Defines sizes, scenarios, profiles, and artifacts of the optional constant rules benchmark. */
import { DUPLICATE_RULE, PARSER_ONLY_MODE, REUSE_RULE } from "./shared.js";

/** Candidate counts intentionally vary independently of lexical depth. */
export const CANDIDATE_COUNTS = [100, 500, 1000];
export const SCOPE_DEPTH = 20;

/** Lookup scenarios: matches, misses, nesting, shared values, and parameter shadowing. */
export const WIDE_HIT_SCENARIO = "wide-hit";
export const WIDE_MISS_SCENARIO = "wide-miss";
export const NESTED_SCENARIO = "nested";
export const SAME_VALUE_SCENARIO = "same-value";
export const SHADOWED_HIT_SCENARIO = "shadowed-hit";
export const SHADOWED_MISS_SCENARIO = "shadowed-miss";
export const SCENARIOS = [WIDE_HIT_SCENARIO, WIDE_MISS_SCENARIO, NESTED_SCENARIO, SAME_VALUE_SCENARIO, SHADOWED_HIT_SCENARIO, SHADOWED_MISS_SCENARIO];
/** Scenarios where no visible constant can be suggested. */
export const MISS_SCENARIOS = [WIDE_MISS_SCENARIO, SHADOWED_MISS_SCENARIO];

/** Rule combinations profiled per scenario. */
export const MODES = [
  { name: PARSER_ONLY_MODE, rules: {} },
  { name: "reuse", rules: { [REUSE_RULE]: "warn" } },
  { name: "duplicates", rules: { [DUPLICATE_RULE]: "warn" } },
  { name: "both", rules: { [REUSE_RULE]: "warn", [DUPLICATE_RULE]: "warn" } },
];

/** Virtual file linted by every sample. */
export const LINTED_FILE_PATH = "benchmark.js";
/** CLI flags selecting baseline capture or comparison against it. */
export const COMPARE_FLAG = "--compare";
export const BASELINE_FLAG = "--baseline";
/** Report files, relative to the benchmark module. */
export const BASELINE_REPORT_PATH = "./constants-before.json";
export const RESULTS_REPORT_PATH = "./constants-results.json";
