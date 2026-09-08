/** @file Audits lexical reuse across destructuring, imports, closures, and runtime initialization. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { createConfig } from "../dist/index.js";

/**
 * Exercises advisory reuse with a real parser and optional language settings.
 * @param {string} code - Consumer source.
 * @param {object} languageOptions - Language overrides.
 * @returns {object[]} Public diagnostics.
 */
function lint(code, languageOptions = {}) {
  return new Linter().verify(code, [{ languageOptions: { parser, ...languageOptions } },
    ...createConfig({ contractSeverity: "off", duplicateSeverity: "off", reuse: true }),
  ]);
}

for (const code of [
  'const { STATE = "pending" } = input; status === "pending";',
  'const [STATE] = ["pending"]; status === "pending";',
  'import { STATE } from "states"; status === "pending";',
  'import * as states from "states"; status === "pending";',
  'const STATE = "pen" + "ding"; status === "pending";',
  'const STATE = load(); status === "pending";',
  'const STATE = `pen${suffix}`; status === "pending";',
  'const STATE = "pending"; const read = ({STATE}) => status === "pending";',
  'const STATE = "pending"; const read = ([STATE]) => status === "pending";',
]) {
  it(`should not infer inaccessible or unevaluated bindings in ${code}`, () => {
    assert.equal(lint(code).length, 0);
  });
}

it("should avoid outer bindings across hoisted functions that can execute before initialization", () => {
  assert.equal(lint('read(); const STATE = "pending"; function read() { return status === "pending"; }').length, 0);
  assert.equal(lint('read(); const STATE = "pending"; function read() { return (() => status === "pending")(); }').length, 0);
});

it("should preserve local constants and safely created closures", () => {
  for (const code of [
    'function read() { const STATE = "pending"; return status === "pending"; }',
    'const STATE = "pending"; const read = () => status === "pending";',
    'const STATE = "pending"; const read = function() { return status === "pending"; };',
    'export const STATE = "pending" as const; status === `pending`;',
  ]) {
    const messages = lint(code);
    assert.equal(messages.length, 1);
    assert.ok(messages[0].message.includes("STATE"));
  }
});

it("should avoid dynamic with scopes", () => {
  assert.equal(lint('const STATE = "pending"; with (object) { status === "pending"; }', { sourceType: "script" }).length, 0);
});
