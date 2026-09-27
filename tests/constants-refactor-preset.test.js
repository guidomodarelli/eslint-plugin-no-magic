/** @file Verifies structural discriminants, constants placement and the constants-refactor preset through real ESLint. */
import assert from "node:assert/strict";
import { join } from "node:path";
import process from "node:process";
import { describe, it } from "vitest";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin, { createConfig } from "../dist/index.js";

/**
 * Lints TypeScript-compatible source with one rule.
 * @param {string} code - Source text.
 * @param {string} name - Public rule name.
 * @param {object} [options] - Rule options.
 * @param {string} [filename] - Virtual path relative to the working directory.
 * @returns {object[]} Public ESLint diagnostics.
 */
function lint(code, name, options, filename = "src/module.ts") {
  const config = [{ files: ["**/*.ts"], languageOptions: { parser }, plugins: { "no-magic": plugin }, rules: { [`no-magic/${name}`]: options ? ["warn", options] : "warn" } }];
  return new Linter({ cwd: process.cwd() }).verify(code, config, { filename: join(process.cwd(), filename) });
}

/**
 * Lints with a configuration produced by createConfig.
 * @param {string} code - Source text.
 * @param {object} settings - createConfig settings.
 * @param {string} [filename] - Virtual path relative to the working directory.
 * @returns {object[]} Public ESLint diagnostics.
 */
function lintWithConfig(code, settings, filename = "src/module.ts") {
  const config = [{ files: ["**/*.ts"], languageOptions: { parser } }, ...createConfig(settings)];
  return new Linter({ cwd: process.cwd() }).verify(code, config, { filename: join(process.cwd(), filename) });
}

describe("structuralDiscriminants", () => {
  const discriminants = { structuralDiscriminants: ["type", "kind", "operator"] };

  it("should report structural comparisons by default for backward compatibility", () => {
    assert.equal(lint('node.type === "Identifier";', "no-magic-contracts").length, 1);
  });

  for (const code of [
    'node.type === "Identifier";',
    '"Identifier" !== node.type;',
    'node?.type === "Identifier";',
    'node.type === ("Identifier" as const);',
    'node["kind"] === "method";',
    'switch (node.operator) { case "&&": break; }',
    'node.type === (ready ? "Literal" : "TemplateLiteral");',
  ]) {
    it(`should ignore a configured discriminant in ${code}`, () => {
      assert.equal(lint(code, "no-magic-contracts", discriminants).length, 0);
    });
  }

  for (const code of ['status === "pending";', 'node.status === "pending";', 'switch (state) { case "ready": break; }', 'type === "Identifier";']) {
    it(`should keep reporting non-discriminant contracts in ${code}`, () => {
      assert.equal(lint(code, "no-magic-contracts", discriminants).length, 1);
    });
  }

  it("should skip discriminant values in reuse suggestions", () => {
    const code = 'const IDENTIFIER = "Identifier"; node.type === "Identifier";';
    assert.equal(lint(code, "prefer-existing-constant").length, 1);
    assert.equal(lint(code, "prefer-existing-constant", discriminants).length, 0);
  });

  it("should classify duplicates through contractOptions only", () => {
    const code = 'a.type === "Literal"; b.type === "Literal"; c.type === "Literal";';
    assert.equal(lint(code, "no-duplicate-strings", { ignoreContracts: false }).length, 3);
    assert.equal(lint(code, "no-duplicate-strings", { ignoreContracts: false, contractOptions: discriminants }).length, 0);
    assert.throws(() => lint(code, "no-duplicate-strings", discriminants), /should NOT have additional properties|Unexpected property/u);
  });
});

describe("require-constants-location", () => {
  it("should report exported static constants outside constants modules", () => {
    const messages = lint('export const LIMIT = 10; const LOCAL = "local"; export const NOW = Date.now();', "require-constants-location");
    assert.deepEqual(messages.map((message) => message.messageId), ["constantOutsideConstantsModule"]);
    assert.ok(messages[0].message.includes("LIMIT"));
    assert.ok(messages[0].message.includes("**/constants/**"));
  });

  it("should treat specifier exports as exported", () => {
    assert.equal(lint('const LIMIT = 10; export { LIMIT };', "require-constants-location").length, 1);
  });

  it("should accept declarations inside matching modules", () => {
    assert.equal(lint("export const LIMIT = 10;", "require-constants-location", undefined, "src/constants/limits.ts").length, 0);
    assert.equal(lint("export const LIMIT = 10;", "require-constants-location", { patterns: ["src/config/*.ts"] }, "src/config/limits.ts").length, 0);
    assert.equal(lint("export const LIMIT = 10;", "require-constants-location", { patterns: ["src/config/*.ts"] }, "src/config/nested/limits.ts").length, 1);
  });

  it("should report every static module-level constant when exportedOnly is false", () => {
    const code = [
      'const NAME = "name";',
      "const PATTERN = /^a+$/u;",
      "const OFFSET = -1;",
      "const TEMPLATE = `static`;",
      'const LIST = ["a", 1, null] as const;',
      'const MAP = { "key": { nested: [true] } } satisfies object;',
    ].join("\n");
    assert.equal(lint(code, "require-constants-location", { exportedOnly: false }).length, 6);
  });

  for (const code of [
    "const NOW = Date.now();",
    "const TEMPLATE = `a${value}`;",
    "const COPY = [...OTHER];",
    "const ALIAS = OTHER;",
    "const MAP = { value };",
    "const MAP = { [key]: 1 };",
    "const MAP = { read() { return 1; } };",
    "let MUTABLE = 1;",
    "function scope() { const LOCAL = 1; }",
    "const { first } = { first: 1 };",
  ]) {
    it(`should not report runtime, mutable, nested or destructured values in ${code}`, () => {
      assert.equal(lint(code, "require-constants-location", { exportedOnly: false }).length, 0);
    });
  }

  it("should honor excluded constant names", () => {
    assert.equal(lint("export const LIMIT = 10;", "require-constants-location", { ignoreConstantNames: ["LIMIT"] }).length, 0);
  });

  for (const options of [{ patterns: [] }, { patterns: [""] }, { exportedOnly: "no" }, { unknown: true }]) {
    it(`should reject invalid options ${JSON.stringify(options)}`, () => {
      assert.throws(() => lint("export const LIMIT = 10;", "require-constants-location", options));
    });
  }
});

describe("createConfig preset constants-refactor", () => {
  it("should ignore structural discriminants and require constants placement", () => {
    const code = 'node.type === "Identifier"; const LIMIT = 10; status === "pending";';
    const messages = lintWithConfig(code, { preset: "constants-refactor" });
    assert.deepEqual(messages.map((message) => message.ruleId).sort(), ["no-magic/no-magic-contracts", "no-magic/require-constants-location"]);
    assert.equal(lintWithConfig(code, { preset: "constants-refactor" }, "src/constants/rules.ts").length, 1);
  });

  it("should keep explicit options above preset defaults", () => {
    const code = 'node.type === "Identifier"; node.kind === "method"; const LIMIT = 10; export const EXPORTED = 1;';
    const messages = lintWithConfig(code, {
      preset: "constants-refactor",
      contracts: { structuralDiscriminants: ["type"] },
      constantsLocation: { exportedOnly: true, severity: "error" },
    });
    assert.deepEqual(messages.map((message) => [message.ruleId, message.severity]), [
      ["no-magic/no-magic-contracts", 2],
      ["no-magic/require-constants-location", 2],
    ]);
    assert.equal(lintWithConfig(code, { preset: "constants-refactor", constantsLocation: false }).filter((message) => message.ruleId === "no-magic/require-constants-location").length, 0);
  });

  it("should leave configurations without the preset unchanged", () => {
    const [config] = createConfig();
    assert.equal(config.rules["no-magic/require-constants-location"], undefined);
    assert.equal(config.rules["no-magic/no-magic-contracts"][1].structuralDiscriminants, undefined);
    assert.deepEqual(createConfig({ constantsLocation: true })[0].rules["no-magic/require-constants-location"], ["warn", {}]);
  });

  for (const settings of [{ preset: "strict" }, { preset: "constants-refactor", constantsLocation: [] }, { constantsLocation: { patterns: ["x"], unknown: 1 } }]) {
    it(`should reject ${JSON.stringify(settings)}`, () => {
      assert.throws(() => createConfig(settings), /createConfig:/u);
    });
  }
});
