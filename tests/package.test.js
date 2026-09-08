/** @file Exercises the packed artifact with real ESLint and TypeScript consumers. */
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import process from "node:process";
import { tmpdir } from "node:os";
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
  const consumerRoot = mkdtempSync(join(tmpdir(), "no-magic-types-consumer-"));
  try {
    // The generated basename contains only a fixed prefix and random alphanumeric suffix.
    execSync(`pnpm --ignore-scripts pack --pack-destination ${basename(fixtureRoot)}`, {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
    const archive = readdirSync(fixtureRoot).find((filename) => filename.endsWith(".tgz"));
    assert.ok(archive, "Packing must produce a tarball");
    execFileSync("tar", ["-xf", join(fixtureRoot, archive), "-C", fixtureRoot]);
    const packageRoot = join(fixtureRoot, "package");
    const packagedPaths = execFileSync("tar", ["-tf", join(fixtureRoot, archive)], { encoding: "utf8" }).split(/\r?\n/u);
    const { default: plugin } = await import(pathToFileURL(join(packageRoot, "dist/index.js")).href);
    assert.ok(packagedPaths.includes("package/dist/index.js"));
    assert.ok(packagedPaths.includes("package/dist/index.d.ts"));
    assert.ok(!packagedPaths.some((path) => path.startsWith("package/src/")));
    for (const name of Object.keys(plugin.rules)) {
      assert.ok(packagedPaths.includes(`package/docs/rules/${name}.md`), `Missing packaged documentation for ${name}`);
    }
    const messages = new Linter().verify('router.push(ready ? "/checkout" : "/login");', plugin.configs.recommended);
    assert.deepEqual(messages.map((message) => message.messageId), ["noMagicString", "noMagicString"]);

    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: plugin.configs.recommended });
    const formatter = await eslint.loadFormatter(join(packageRoot, "dist/formatter.js"));
    const results = await eslint.lintText('track("event");');
    assert.ok((await formatter.format(results)).includes("configured call argument"));

    // The physical consumer package is outside the repository and cannot resolve its dev dependencies.
    const modulesRoot = join(consumerRoot, "node_modules");
    mkdirSync(modulesRoot, { recursive: true });
    cpSync(packageRoot, join(modulesRoot, "eslint-plugin-no-magic"), { recursive: true });
    symlinkSync(dirname(require.resolve("eslint/package.json")), join(modulesRoot, "eslint"), "junction");
    writeFileSync(join(consumerRoot, "package.json"), '{"type":"module"}');
    for (const fixture of readdirSync(join(repositoryRoot, "tests/types"))) {
      if (fixture.endsWith(".ts")) cpSync(join(repositoryRoot, "tests/types", fixture), join(consumerRoot, fixture));
    }
    const consumerEnvironment = { ...process.env };
    delete consumerEnvironment.NODE_PATH;
    delete consumerEnvironment.NODE_OPTIONS;
    // Use plain Node without inherited module paths or loaders from the test runner.
    execFileSync(process.execPath, ["--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";
      import { Linter } from "eslint";
      import { createConfig } from "eslint-plugin-no-magic";
      import formatter from "eslint-plugin-no-magic/formatter";
      const consumerRequire = createRequire(import.meta.url);
      for (const dependency of ["@typescript-eslint/parser", "@typescript-eslint/utils", "@typescript/native", "typescript", "vitest", "@types/node/package.json"]) {
        assert.throws(() => consumerRequire.resolve(dependency), { code: "MODULE_NOT_FOUND" }, dependency);
      }
      const messages = new Linter().verify('track("event");', createConfig());
      assert.equal(messages.length, 1);
      assert.equal(messages[0].ruleId, "no-magic/no-magic-contracts");
      assert.equal(formatter([]), "");
    `], { cwd: consumerRoot, env: consumerEnvironment, stdio: "inherit" });
    writeFileSync(join(consumerRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, module: "NodeNext", target: "ES2022", types: [] },
      include: ["*.ts"],
    }));
    execFileSync(process.execPath, [join(dirname(require.resolve("@typescript/native/package.json")), require("@typescript/native/package.json").bin.tsc), "--project", consumerRoot], { env: consumerEnvironment, stdio: "inherit" });
  } finally {
    // Remove only the fixture created by this test, including its owned junctions.
    rmSync(fixtureRoot, { recursive: true, force: true });
    rmSync(consumerRoot, { recursive: true, force: true });
  }
}, 60000);
