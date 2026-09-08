/** @file Exercises the packed artifact with real ESLint and TypeScript consumers. */
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { it } from "vitest";
import { ESLint, Linter } from "eslint";

/** Anchors packing and cleanup to the repository containing this test. */
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
/** Resolves installed CLI dependencies without relying on shell search paths. */
const require = createRequire(import.meta.url);

it("should lint and typecheck a consumer when the published artifact is extracted", async () => {
  const fixtureRoot = mkdtempSync(join(repositoryRoot, ".package-test-"));
  try {
    // The generated basename contains only a fixed prefix and random alphanumeric suffix.
    execSync(`pnpm pack --pack-destination ${basename(fixtureRoot)}`, {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
    const archive = readdirSync(fixtureRoot).find((filename) => filename.endsWith(".tgz"));
    assert.ok(archive, "Packing must produce a tarball");
    execFileSync("tar", ["-xf", join(fixtureRoot, archive), "-C", fixtureRoot]);
    const packageRoot = join(fixtureRoot, "package");
    const { default: plugin } = await import(pathToFileURL(join(packageRoot, "index.js")).href);
    const messages = new Linter().verify('router.push(ready ? "/checkout" : "/login");', plugin.configs.recommended);
    assert.deepEqual(messages.map((message) => message.messageId), ["noMagicString", "noMagicString"]);

    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommended });
    const formatter = await eslint.loadFormatter(join(packageRoot, "formatter.js"));
    const results = await eslint.lintText('track("event");');
    assert.ok((await formatter.format(results)).includes("configured call argument"));

    // Resolve the public package export from a separate consumer directory.
    const consumerRoot = join(fixtureRoot, "consumer");
    const modulesRoot = join(consumerRoot, "node_modules");
    mkdirSync(modulesRoot, { recursive: true });
    symlinkSync(packageRoot, join(modulesRoot, "eslint-plugin-no-magic"), "junction");
    symlinkSync(dirname(require.resolve("eslint/package.json")), join(modulesRoot, "eslint"), "junction");
    writeFileSync(join(consumerRoot, "package.json"), '{"type":"module"}');
    writeFileSync(join(consumerRoot, "consumer.ts"), readFileSync(join(repositoryRoot, "tests/types/consumer.ts")));
    writeFileSync(join(consumerRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, module: "NodeNext", target: "ES2022", types: [] },
      files: ["consumer.ts"],
    }));
    execFileSync("node", [join(dirname(require.resolve("@typescript/native/package.json")), require("@typescript/native/package.json").bin.tsc), "--project", consumerRoot], { stdio: "inherit" });
  } finally {
    // Remove only the fixture created by this test, including its owned junctions.
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 60000);
