/** @file Builds clean JavaScript and public declarations with TypeScript 7. */
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

/** Build output is owned exclusively by this project, never a computed user path. */
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const compilerRoot = dirname(require.resolve("@typescript/native/package.json"));
rmSync(join(root, "dist"), { recursive: true, force: true });
execFileSync(process.execPath, [join(compilerRoot, require("@typescript/native/package.json").bin.tsc), "--project", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
