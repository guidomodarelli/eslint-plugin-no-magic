/** @file Verifies actual ESLint merge semantics for overlapping helper configurations. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { Linter } from "eslint";
import { createConfig } from "../dist/index.js";

it("should replace complete core options only for matching files", () => {
  const config = [
    ...createConfig({ files: ["src/**/*.js"], contracts: { sinks: ["send"] }, duplicates: { minDuplicates: 2 } }),
    ...createConfig({ files: ["src/special/**/*.js"], contracts: { sinks: ["special"] }, duplicateSeverity: "off", contractSeverity: "warn" }),
  ];
  const code = 'send("event"); special("other"); label("dup"); label("dup");';
  const normal = new Linter().verify(code, config, { filename: "src/normal.js" });
  assert.deepEqual(normal.map((message) => message.severity), [2, 1, 1]);
  const special = new Linter().verify(code, config, { filename: "src/special/index.js" });
  assert.equal(special.length, 1);
  assert.equal(special[0].severity, 1);
  assert.ok(special[0].message.includes("configured call argument"));
  assert.equal(new Linter().verify(code, config, { filename: "outside.js" }).length, 0);
});

it("should disable earlier advisory rules when a matching helper explicitly sets false", () => {
  const config = [
    ...createConfig({ contractSeverity: "off", duplicateSeverity: "off", reuse: true, constantDuplicates: true }),
    ...createConfig({ files: ["tests/**/*.js"], contractSeverity: "off", duplicateSeverity: "off", reuse: false, constantDuplicates: false }),
  ];
  const code = 'const FIRST = "event"; const SECOND = "event"; track("event");';
  assert.equal(new Linter().verify(code, config, { filename: "src/index.js" }).length, 2);
  assert.equal(new Linter().verify(code, config, { filename: "tests/index.js" }).length, 0);
});

it("should preserve omitted advisory policies according to ESLint inheritance", () => {
  const config = [
    ...createConfig({ contractSeverity: "off", duplicateSeverity: "off", reuse: { severity: "error" } }),
    ...createConfig({ files: ["src/**/*.js"], contractSeverity: "off", duplicateSeverity: "off" }),
  ];
  const messages = new Linter().verify('const EVENT = "event"; track("event");', config, { filename: "src/index.js" });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 2);
});

it("should honor config order and severity-only ESLint overrides", () => {
  const base = createConfig({ contracts: { sinks: ["send"] }, duplicateSeverity: "off" });
  const override = { files: ["src/**/*.js"], rules: { "no-magic/no-magic-contracts": "warn" } };
  const code = 'send("event");';
  assert.equal(new Linter().verify(code, [...base, override], { filename: "src/a.js" })[0].severity, 1);
  assert.equal(new Linter().verify(code, [override, ...base], { filename: "src/a.js" })[0].severity, 2);
});

it("should resynchronize advisory contracts when explicitly re-enabled in a narrower config", () => {
  const config = [
    ...createConfig({ contracts: { sinks: ["send"] }, contractSeverity: "off", duplicateSeverity: "off", reuse: true }),
    ...createConfig({ files: ["src/**/*.js"], contracts: { sinks: ["special"] }, contractSeverity: "off", duplicateSeverity: "off", reuse: true }),
  ];
  const messages = new Linter().verify('const EVENT = "event"; send("event"); special("event");', config, { filename: "src/a.js" });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].column, 47);
});
