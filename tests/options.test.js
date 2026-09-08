/** @file Exercises public options together through real ESLint configuration. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import plugin from "../index.js";

/** Registers the real plugin with independently configurable rules. */
const plugins = { "no-magic": plugin };

it("should omit contract duplicates by default in a manual configuration", () => {
  const messages = new Linter().verify('track("event"); track("event"); label("event");', [{ plugins, rules: {
    "no-magic/no-duplicate-strings": "warn",
  } }]);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, "duplicateString");
  assert.ok(messages[0].message.includes("repeated 3 times"));
});

it("should omit overlapping warnings when the recommended preset sees repeated contracts", () => {
  const messages = new Linter().verify('track("event"); track("event"); track("event");', plugin.configs.recommended);
  assert.equal(messages.length, 3);
  assert.ok(messages.every((message) => message.ruleId === "no-magic/no-magic-contracts"));
});

it("should retain ignored contract occurrences when counting other duplicate positions", () => {
  const messages = new Linter().verify('track("event"); label("event"); label("event");', plugin.configs.recommended);
  assert.deepEqual(messages.map((message) => message.messageId), ["noMagicString", "duplicateString", "duplicateString"]);
  assert.ok(messages.slice(1).every((message) => message.message.includes("repeated 3 times")));
});

it("should restore overlap when ignoreContracts is explicitly disabled", () => {
  const messages = new Linter().verify('track("event"); track("event"); track("event");', [
    ...plugin.configs.recommended,
    { rules: { "no-magic/no-duplicate-strings": ["warn", { ignoreContracts: false }] } },
  ]);
  assert.equal(messages.filter((message) => message.messageId === "duplicateString").length, 3);
  assert.equal(messages.filter((message) => message.messageId === "noMagicString").length, 3);
});

it("should align custom sinks and action properties between independent rules", () => {
  const contractOptions = {
    sinks: [{ callee: "client.send", argumentIndex: 1 }],
    actionTypeCallees: ["emit"], actionTypeProperty: "kind",
  };
  const messages = new Linter().verify('client.send("event", "event"); emit({kind: "event"});', [{ plugins, rules: {
    "no-magic/no-magic-contracts": ["error", contractOptions],
    "no-magic/no-duplicate-strings": ["warn", { ignoreContracts: true, contractOptions }],
  } }]);
  assert.equal(messages.filter((message) => message.messageId === "noMagicString").length, 2);
  assert.equal(messages.filter((message) => message.messageId === "duplicateString").length, 1);
  assert.equal(messages[0].messageId, "duplicateString");
});

it("should report duplicates when a custom contract allowlist excludes the value", () => {
  const contractOptions = { ignoreStrings: ["event"] };
  const messages = new Linter().verify('track("event"); track("event");', [{ plugins, rules: {
    "no-magic/no-magic-contracts": ["error", contractOptions],
    "no-magic/no-duplicate-strings": ["warn", { minDuplicates: 2, ignoreContracts: true, contractOptions }],
  } }]);
  assert.deepEqual(messages.map((message) => message.messageId), ["duplicateString", "duplicateString"]);
});

it("should allow duplicate values explicitly without disabling their contract errors", () => {
  const messages = new Linter().verify('track("event"); track("event");', [{ plugins, rules: {
    "no-magic/no-magic-contracts": "error",
    "no-magic/no-duplicate-strings": ["warn", { minDuplicates: 2, ignoreStrings: ["event"] }],
  } }]);
  assert.deepEqual(messages.map((message) => message.messageId), ["noMagicString", "noMagicString"]);
});

for (const threshold of [0, 1, 2, 3]) {
  it(`should respect threshold ${threshold} with custom sinks and ignoreStrings`, () => {
    const messages = new Linter().verify('send("keep"); send("keep"); send("skip");', [{ plugins, rules: {
      "no-magic/no-magic-strings": ["error", { sinks: [], actionTypeCallees: [], minDuplicates: threshold, ignoreStrings: ["skip"] }],
    } }]);
    assert.equal(messages.length, threshold === 1 || threshold === 2 ? 2 : 0);
    assert.ok(messages.every((message) => message.messageId === "duplicateString"));
  });
}

for (const options of [
  { ignoreContracts: "true" },
  { contractOptions: { minDuplicates: 2 } },
  { contractOptions: { sinks: [{ callee: "send", argumentIndex: -1 }] } },
  { minDuplicates: -1 },
  { minDuplicates: 1.5 },
]) {
  it(`should reject invalid duplicate configuration ${JSON.stringify(options)}`, () => {
    assert.throws(() => new Linter().verify("", [{ plugins, rules: {
      "no-magic/no-duplicate-strings": ["warn", options],
    } }]), /no-magic\/no-duplicate-strings/);
  });
}
