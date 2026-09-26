/** @module constants/memory-benchmark Defines file shapes, batches, profiles, and artifacts of the memory benchmark. */
import { PARSER_ONLY_MODE } from "./shared.js";

/** Each file stresses multiple scope indexes, repeated definitions, and unique values. */
export const SCOPES_PER_FILE = 8;
export const VALUES_PER_SCOPE = 25;
export const WARMUP_FILES = 5;
export const FILE_BATCHES = [25, 25, 50];

/** Profiles run in isolated processes: parser only, reuse only, or both optional rules. */
export const BOTH_RULES_MODE = "both";
export const MODES = [PARSER_ONLY_MODE, "reuse", BOTH_RULES_MODE];

/** Worker CLI flags: the selected profile and exposed garbage collection. */
export const MODE_FLAG = "--mode";
export const EXPOSE_GC_FLAG = "--expose-gc";
/** Report file, relative to the benchmark module. */
export const RESULTS_REPORT_PATH = "./memory-results.json";
