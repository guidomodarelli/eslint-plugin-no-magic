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

it("should treat imported libraries equally instead of granting framework exemptions", () => {
  const library = (source) => `import { Font } from "${source}"; Font({values: ["latin", "latin", "latin"]});`;
  const first = lint(library("next/font/google"), "no-duplicate-strings");
  const second = lint(library("any-library"), "no-duplicate-strings");
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((message) => message.messageId), second.map((message) => message.messageId));
});
