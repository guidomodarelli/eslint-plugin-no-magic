/** @file Validates independent rule responsibilities and reason-specific diagnostics. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import plugin from "../index.js";

  it(`should configure contracts and duplicates independently with ESLint ${Linter.version}`, () => {
    const linter = new Linter();
    const code = 'track("event"); label("pending"); label("pending"); label("pending");';
    const messages = linter.verify(code, plugin.configs.recommended);
    assert.deepEqual(messages.map(({ ruleId, severity }) => [ruleId, severity]), [
      ["no-magic/no-magic-contracts", 2],
      ["no-magic/no-duplicate-strings", 1],
      ["no-magic/no-duplicate-strings", 1],
      ["no-magic/no-duplicate-strings", 1],
    ]);
    const contractsOnly = linter.verify(code, [...plugin.configs.recommended,
      { rules: { "no-magic/no-duplicate-strings": "off" } }]);
    assert.equal(contractsOnly.length, 1);
    const duplicatesOnly = linter.verify(code, [...plugin.configs.recommended,
      { rules: { "no-magic/no-magic-contracts": "off" } }]);
    assert.equal(duplicatesOnly.length, 3);
    const ignored = linter.verify(code, [{ plugins: { "no-magic": plugin }, rules: {
      "no-magic/no-duplicate-strings": ["warn", { ignoreStrings: ["pending"], minDuplicates: 2 }],
    } }]);
    assert.equal(ignored.length, 0);
  });

  it(`should explain each contract with ESLint ${Linter.version}`, () => {
    const cases = [
      ['status === "pending";', "comparison value"],
      ['switch(status) { case "pending": break; }', "switch case value"],
      ['dispatch({type: "cart/add"});', "action type"],
      ['localStorage.getItem("token");', "storage key"],
      ['router.push(`/users/${id}`);', "navigation argument"],
      ['getFlag("new_ui");', "feature flag identifier"],
      ['track("click");', "configured call argument"],
    ];
    for (const [code, reason] of cases) {
      const messages = new Linter().verify(code, plugin.configs.recommended);
      assert.equal(messages.length, 1);
      assert.equal(messages[0].message, `Extract this ${reason} into a named constant or configuration value.`);
    }
  });

  it(`should count repeated contracts independently with ESLint ${Linter.version}`, () => {
    const messages = new Linter().verify('track("event"); track("event");', [{
      plugins: { "no-magic": plugin },
      rules: { "no-magic/no-duplicate-strings": ["warn", { minDuplicates: 2 }] },
    }]);
    assert.equal(messages.length, 2);
    assert.ok(messages.every((message) => message.messageId === "duplicateString"));
  });
