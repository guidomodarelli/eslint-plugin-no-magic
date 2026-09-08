/** @file Exercises the shared configuration API through real ESLint behavior. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import { createConfig } from "../index.js";

it("should synchronize custom contracts and duplicate suppression", () => {
  const config = createConfig({ contracts: { sinks: ["send"] }, duplicates: { minDuplicates: 2 } });
  const messages = new Linter().verify('send("event"); label("event");', config);
  assert.deepEqual(messages.map((message) => message.messageId), ["noMagicString", "duplicateString"]);
});

it("should report repeated contracts when the contract rule is disabled", () => {
  const messages = new Linter().verify('track("event"); track("event");', createConfig({
    contractSeverity: "off", duplicates: { minDuplicates: 2 },
  }));
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message.messageId === "duplicateString" && message.severity === 1));
});

it("should isolate callers and repeated createConfig calls", () => {
  const contracts = { sinks: [{ callee: "send", argumentIndex: 0 }] };
  const first = createConfig({ contracts });
  contracts.sinks[0].callee = "changed";
  assert.equal(new Linter().verify('send("event");', first).length, 1);
  first[0].rules["no-magic/no-magic-contracts"][1].sinks[0].callee = "other";
  assert.equal(new Linter().verify('track("event");', createConfig()).length, 1);
});

it("should apply file filters and shared allowlists", () => {
  const config = createConfig({ files: ["src/**/*.js"], contracts: { ignoreStrings: ["event"] } });
  assert.equal(new Linter().verify('track("event"); track("event"); track("event");', config, { filename: "src/index.js" }).length, 0);
  assert.equal(new Linter().verify('track("other");', config, { filename: "outside.js" }).length, 0);
});

for (const settings of [null, [], { unknown: true }, { contractSeverity: "fatal" }, { duplicates: { contractOptions: {} } }, { files: "src" }]) {
  it(`should reject unsupported helper settings ${JSON.stringify(settings)}`, () => {
    assert.throws(() => createConfig(settings), /createConfig:/);
  });
}

it("should enable optional rules with shared contracts and independent severities", () => {
  const config = createConfig({
    contracts: { sinks: ["send"] }, contractSeverity: "off", duplicateSeverity: "off",
    reuse: { severity: "error" }, constantDuplicates: true,
  });
  const messages = new Linter().verify('const FIRST = "event"; const SECOND = "event"; send("event");', config);
  assert.deepEqual(messages.map((message) => [message.ruleId, message.severity]), [
    ["no-magic/no-duplicate-constants", 1], ["no-magic/prefer-existing-constant", 2],
  ]);
});

it("should keep advisory rules off by default and honor exclusions when enabled", () => {
  const code = 'const FIRST = "event"; const SECOND = "event"; send("event");';
  const base = { contractSeverity: "off", duplicateSeverity: "off" };
  assert.equal(new Linter().verify(code, createConfig(base)).length, 0);
  assert.equal(new Linter().verify(code, createConfig({ ...base, reuse: false, constantDuplicates: false })).length, 0);
  assert.equal(new Linter().verify(code, createConfig({ ...base, contracts: { sinks: ["send"] },
    reuse: { ignoreConstantNames: ["FIRST", "SECOND"] }, constantDuplicates: { ignoreValues: ["event"] },
  })).length, 0);
});

it("should clone advisory options and reject invalid helper settings", () => {
  const reuse = { ignoreConstantNames: ["FIRST"] };
  const config = createConfig({ contracts: { sinks: ["send"] }, contractSeverity: "off", duplicateSeverity: "off", reuse });
  reuse.ignoreConstantNames.length = 0;
  assert.equal(new Linter().verify('const FIRST = "event"; send("event");', config).length, 0);
  for (const settings of [{ reuse: null }, { reuse: { severity: "fatal" } }, { reuse: { sinks: [] } }, { constantDuplicates: [] }]) {
    assert.throws(() => createConfig(settings), /createConfig:/);
  }
});
