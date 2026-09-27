/** @module constants/strings-benchmark Defines fixture sizes and nesting of the end-to-end string rules benchmark. */

/** Counts of generated blocks; each contributes three candidate strings. */
export const BLOCK_COUNTS = [100, 1000, 5000];
/** Candidate strings contributed by each generated block. */
export const LITERALS_PER_BLOCK = 3;
/** Nesting is fixed so fixture size and AST depth vary independently. */
export const EXPRESSION_DEPTH = 40;
/** Files matched by the fixture language configuration. */
export const FIXTURE_FILES_GLOB = "**/*.{js,jsx,ts}";
/** Diagnostics the recommended preset reports per block: two contracts and one duplicate. */
export const RECOMMENDED_DIAGNOSTICS_PER_BLOCK = 3;
