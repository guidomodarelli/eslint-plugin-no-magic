/** @module constants/build Defines build output, compiler resolution, and complete quality gate commands. */

/** Generated artifact directory, owned exclusively by the build. */
export const BUILD_OUTPUT_DIRECTORY = "dist";
/** Manifest used to resolve the native TypeScript compiler binary. */
export const COMPILER_PACKAGE_MANIFEST = "@typescript/native/package.json";
/** Compiler arguments selecting the project that emits JavaScript and public declarations. */
export const BUILD_COMPILER_ARGUMENTS = ["--project", "tsconfig.build.json"];

/** One fresh build followed by direct tool invocations, stopping at the first failure. */
export const QUALITY_GATE_COMMANDS = ["pnpm build", "pnpm exec vitest run", "pnpm exec tsc --project tsconfig.json", "pnpm lint"];
