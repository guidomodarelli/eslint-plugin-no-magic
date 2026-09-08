/** @file Verifies advisory constant reuse with real lexical scopes and parser integration. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../index.js";

/**
 * Lints a consumer snippet with one optional rule.
 * @param {string} code - TypeScript-compatible source.
 * @param {string} name - Public rule name.
 * @param {object} options - Rule options.
 * @returns {object[]} Public ESLint diagnostics.
 */
function lint(code, name, options = {}) {
  return new Linter().verify(code, [{ languageOptions: { parser }, plugins: { "no-magic": plugin }, rules: { [`no-magic/${name}`]: ["warn", options] } }]);
}

it("should suggest a preceding visible constant in a string contract", () => {
  const messages = lint('const PENDING = "pending" as const; status === "pending";', "prefer-existing-constant");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, "existingConstant");
  assert.ok(messages[0].message.includes("PENDING"));
  assert.equal(messages[0].fix, undefined);
});

for (const code of [
  'status === "pending"; const PENDING = "pending";',
  'const PENDING = "pending"; function read(PENDING) { return status === "pending"; }',
  '{ const PENDING = "pending"; } status === "pending";',
  'let PENDING = "pending"; status === "pending";',
]) {
  it(`should avoid unsafe reuse suggestions for ${code}`, () => {
    assert.equal(lint(code, "prefer-existing-constant").length, 0);
  });
}

it("should honor custom contract configuration for reuse", () => {
  const code = 'const EVENT = "event"; send("event");';
  assert.equal(lint(code, "prefer-existing-constant", { sinks: ["send"] }).length, 1);
  assert.equal(lint(code, "prefer-existing-constant", { sinks: ["send"], ignoreStrings: ["event"] }).length, 0);
});

it("should report equal primitive constants only in the same scope", () => {
  const messages = lint('const FIRST = 5000; const SECOND = 5000; function inner() { const THIRD = 5000; }', "no-duplicate-constants");
  assert.equal(messages.length, 1);
  assert.ok(messages[0].message.includes("FIRST"));
  assert.equal(messages[0].fix, undefined);
  assert.equal(lint('const FIRST = 5000; const SECOND = 5000;', "no-duplicate-constants", { ignoreValues: [5000] }).length, 0);
});

it("should ignore trivial and runtime-dependent initializers", () => {
  assert.equal(lint('const FIRST = 1; const SECOND = 1; const THIRD = load(); const FOURTH = load();', "no-duplicate-constants").length, 0);
});

it("should exclude names as both duplicate candidates and reported definitions", () => {
  const code = 'const FIRST = 5000; const SECOND = 5000;';
  for (const name of ["FIRST", "SECOND"]) {
    assert.equal(lint(code, "no-duplicate-constants", { ignoreConstantNames: [name] }).length, 0);
  }
  assert.equal(lint(code, "no-duplicate-constants", { ignoreConstantNames: ["first"] }).length, 1);
});

it("should exclude reuse names without hiding other visible candidates", () => {
  const code = 'const FIRST = "pending"; const SECOND = "pending"; status === "pending";';
  const messages = lint(code, "prefer-existing-constant", { ignoreConstantNames: ["FIRST"] });
  assert.equal(messages.length, 1);
  assert.ok(messages[0].message.includes("SECOND"));
  assert.equal(lint(code, "prefer-existing-constant", { ignoreConstantNames: ["FIRST", "SECOND"] }).length, 0);
});

it("should preserve shadowing and combine name and value exclusions", () => {
  assert.equal(lint('const FIRST = "pending"; function read(FIRST) { return status === "pending"; }', "prefer-existing-constant", { ignoreConstantNames: ["OTHER"] }).length, 0);
  assert.equal(lint('const FIRST = 5000; const SECOND = 5000; const THIRD = 6000; const FOURTH = 6000;', "no-duplicate-constants", {
    ignoreConstantNames: ["FIRST"], ignoreValues: [6000],
  }).length, 0);
});

for (const name of ["prefer-existing-constant", "no-duplicate-constants"]) {
  it(`should reject invalid name exclusions for ${name}`, () => {
    assert.throws(() => lint("", name, { ignoreConstantNames: [123] }), /should be string/);
    assert.throws(() => lint("", name, { ignoreConstantNames: ["FIRST", "FIRST"] }), /duplicate items/);
  });
}

it("should treat imported libraries equally instead of granting framework exemptions", () => {
  const library = (source) => `import { Font } from "${source}"; Font({values: ["latin", "latin", "latin"]});`;
  const first = lint(library("next/font/google"), "no-duplicate-strings");
  const second = lint(library("any-library"), "no-duplicate-strings");
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((message) => message.messageId), second.map((message) => message.messageId));
});

it("should select the nearest available declaration as source position changes", () => {
  const messages = lint('const OUTER = "pending"; { status === "pending"; const INNER = "pending"; status === "pending"; }', "prefer-existing-constant");
  assert.equal(messages.length, 2);
  assert.ok(messages[0].message.includes("OUTER"));
  assert.ok(messages[1].message.includes("INNER"));
});

it("should respect temporal shadowing rather than falling back to an outer name", () => {
  const messages = lint('const STATE = "pending"; { status === "pending"; const STATE = "pending"; status === "pending"; }', "prefer-existing-constant");
  assert.equal(messages.length, 1);
  assert.ok(messages[0].message.includes("STATE"));
  assert.equal(messages[0].column, 86);
});

it("should preserve declaration preference among many equal values and excluded names", () => {
  const declarations = Array.from({ length: 100 }, (_, index) => `const STATE_${index} = "pending";`).join("\n");
  const ignored = Array.from({ length: 99 }, (_, index) => `STATE_${index}`);
  const messages = lint(declarations + '\nstatus === "pending"; status === "pending";', "prefer-existing-constant", { ignoreConstantNames: ignored });
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message.message.includes("STATE_99")));
});

it("should ignore shadowed equal-value candidates while preserving another visible name", () => {
  const messages = lint('const FIRST = "pending"; const SECOND = "pending"; const read = (FIRST) => { status === "pending"; };', "prefer-existing-constant");
  assert.equal(messages.length, 1);
  assert.ok(messages[0].message.includes("SECOND"));
});

it("should not leak scope indexes or exclusions across files and lint calls", () => {
  const linter = new Linter();
  const config = [{ plugins: { "no-magic": plugin }, rules: { "no-magic/prefer-existing-constant": "warn" } }];
  assert.equal(linter.verify('const FIRST = "pending"; status === "pending";', config).length, 1);
  assert.equal(linter.verify('status === "pending";', config).length, 0);
  const ignored = [{ plugins: { "no-magic": plugin }, rules: { "no-magic/prefer-existing-constant": ["warn", { ignoreConstantNames: ["FIRST"] }] } }];
  assert.equal(linter.verify('const FIRST = "pending"; status === "pending";', ignored).length, 0);
  assert.equal(linter.verify('const FIRST = "pending"; status === "pending";', config).length, 1);
});
