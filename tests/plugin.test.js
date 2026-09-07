/** @file Validates public flat configuration and option rejection with ESLint. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { it } from "vitest";
import { Linter } from "eslint";
import plugin from "../index.js";

it("should report contracts when the recommended flat config is used", () => {
  const linter = new Linter();
  const messages = linter.verify('router.push("/checkout");', plugin.configs.recommended);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, "no-magic/no-magic-contracts");
  assert.equal(messages[0].messageId, "noMagicString");
  assert.equal(plugin.meta.version, createRequire(import.meta.url)("../package.json").version);
});

it("should reject invalid descriptors when sink options are configured", () => {
  const linter = new Linter();
  for (const sink of [
    { callee: "router.push", argumentIndex: -1 },
    { callee: "router.push", argumentIndex: 0.5 },
    { callee: "router.push" },
    { callee: "", argumentIndex: 0 },
    { callee: "router.push", argumentIndex: 0, unknown: true },
  ]) {
    assert.throws(() => linter.verify("", [
      ...plugin.configs.recommended,
      { rules: { "no-magic/no-magic-strings": ["error", { sinks: [sink] }] } },
    ]), /no-magic\/no-magic-strings/);
  }
});
