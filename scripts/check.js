/** @file Builds once and validates the resulting artifact through all project quality gates. */
import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

/** Resolve commands from this repository rather than the caller's directory. */
const root = fileURLToPath(new URL("../", import.meta.url));

// Public standalone commands retain their own builds. This complete flow owns
// one fresh build and invokes the tools directly, stopping at the first failure.
for (const command of ["pnpm build", "pnpm exec vitest run", "pnpm exec tsc --project tsconfig.json", "pnpm lint"]) {
  execSync(command, { cwd: root, stdio: "inherit" });
}
