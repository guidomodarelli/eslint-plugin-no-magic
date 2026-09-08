/** @file Exercises independently configurable syntax exemptions through real parsers. */
import assert from "node:assert/strict";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { it } from "vitest";
import { createConfig } from "../dist/index.js";

/**
 * Lints JSX and TypeScript with optional duplicate exemptions.
 * @param {string} code - Source under test.
 * @param {object} ignoreSyntax - Category switches.
 * @returns {object[]} Public diagnostics.
 */
function lint(code, ignoreSyntax = {}) {
  return new Linter().verify(code, [
    { languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...createConfig({ duplicates: { minDuplicates: 2, ignoreSyntax } }),
  ]);
}

for (const [category, code] of [
  ["jsx", '<><Button title="label" /><span>{"label"}</span></>;'],
  ["svg", '<svg><path fill="red" /><path stroke="red" /></svg>;'],
  ["constDefinitions", 'const FIRST = "label"; const SECOND = "label" as const;'],
]) {
  it(`should preserve defaults and include ${category} when explicitly enabled for duplication`, () => {
    assert.equal(lint(code).length, 0);
    const messages = lint(code, { [category]: false });
    assert.equal(messages.length, 2);
    assert.ok(messages.every((message) => message.messageId === "duplicateString"));
  });
}

it("should configure SVG independently of other JSX", () => {
  const code = '<><div title="text">{"text"}</div><svg><path fill="red" /><path stroke="red" /></svg></>;';
  assert.equal(lint(code, { svg: false }).length, 2);
  assert.equal(lint(code, { jsx: false }).length, 2);
  assert.equal(lint(code, { jsx: false, svg: false }).length, 4);
});

it("should preserve structural exemptions and contract detection", () => {
  assert.equal(lint('type State = "label" | "label"; obj["label"]; obj["label"];', { jsx: false, svg: false, constDefinitions: false }).length, 0);
  const messages = lint('<Button disabled={status === "blocked"} />;');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, "noMagicString");
});

it("should reject invalid syntax settings", () => {
  assert.throws(() => lint("", { jsx: "false" }), /no-duplicate-strings/);
  assert.throws(() => lint("", { react: false }), /no-duplicate-strings/);
});
