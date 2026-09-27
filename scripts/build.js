/** @file Builds clean JavaScript and public declarations with TypeScript 7. */
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { BUILD_COMPILER_ARGUMENTS, BUILD_OUTPUT_DIRECTORY, COMPILER_PACKAGE_MANIFEST } from "./constants/build.js";

/** Build output is owned exclusively by this project, never a computed user path. */
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const compilerRoot = dirname(require.resolve(COMPILER_PACKAGE_MANIFEST));
rmSync(join(root, BUILD_OUTPUT_DIRECTORY), { recursive: true, force: true });
execFileSync(process.execPath, [join(compilerRoot, require(COMPILER_PACKAGE_MANIFEST).bin.tsc), ...BUILD_COMPILER_ARGUMENTS], { cwd: root, stdio: "inherit" });
