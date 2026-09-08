/** @file Validates terminal presentation through real ESLint results. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { ESLint } from "eslint";
import { stripVTControlCharacters } from "node:util";
import process from "node:process";
import { createFormatter } from "../formatter.js";
import { createConfig } from "../index.js";

it("should honor NO_COLOR even when FORCE_COLOR is set", () => {
  const previousNoColor = process.env.NO_COLOR;
  const previousForceColor = process.env.FORCE_COLOR;
  try {
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "1";
    const results = [{ filePath: "test.js", messages: [{ severity: 2, message: "Example" }] }];
    const automatic = createFormatter()(results);
    assert.equal(automatic, stripVTControlCharacters(automatic));
    const explicit = createFormatter({ color: true })(results);
    assert.notEqual(explicit, stripVTControlCharacters(explicit));
  } finally {
    if (previousNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = previousNoColor;
    if (previousForceColor === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = previousForceColor;
  }
});

it("should display boxes, source underlines, first occurrence, and summary", async () => {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: createConfig({ duplicates: { minDuplicates: 2 } }) });
  const results = await eslint.lintText('label("pending");\nlabel("pending");', { filePath: "example.js" });
  const output = createFormatter({ color: true })(results);
  const plain = stripVTControlCharacters(output);
  assert.notEqual(output, plain);
  assert.ok(plain.includes("╭─"));
  assert.ok(plain.includes("━━"));
  assert.ok(plain.includes("First occurrence: 1:7"));
  assert.ok(plain.includes('1 | label("pending");'));
  assert.ok(plain.includes("0 errors · 2 warnings"));
});

it("should produce ASCII output without ANSI when decorations are disabled", async () => {
  const results = await new ESLint({ overrideConfigFile: true, overrideConfig: createConfig() }).lintText('track("event");');
  const output = createFormatter({ color: false, unicode: false })(results);
  assert.equal(output, stripVTControlCharacters(output));
  assert.ok(output.includes("+-"));
  assert.ok(output.includes("^^^^"));
  assert.ok(output.includes("1 error | 0 warnings"));
});

it("should safely render missing source, fatal errors, and control characters", () => {
  const output = createFormatter({ color: false })([{
    filePath: "bad\u001b[31m.js", messages: [{ fatal: true, severity: 2, message: "Unexpected\ninput\u001b[0m" }],
  }]);
  assert.ok(output.includes("parse-error"));
  assert.ok(output.includes("\\u001b"));
  assert.ok(!output.includes("\u001b"));
  assert.ok(output.includes("\\u000a"));
  assert.equal(createFormatter()([]), "");
});

it("should keep multiline and long diagnostic spans bounded", () => {
  const output = createFormatter({ color: false })([{
    filePath: "long.js", source: "x".repeat(1000) + "\nnext", messages: [{
      severity: 1, line: 1, column: 800, endLine: 2, endColumn: 4, message: "Example", ruleId: "example",
    }],
  }]);
  assert.ok(output.includes("Span continues to 2:4"));
  assert.ok(output.split("\n").every((line) => line.length < 150));
});

it("should align source spans after tabs and emoji", () => {
  const output = createFormatter({ color: false, unicode: false })([{
    filePath: "unicode.js", source: '\t"😀"; bad', messages: [{ severity: 2, line: 1, column: 8, endLine: 1, endColumn: 11, message: "Example", ruleId: "example" }],
  }]);
  const lines = output.split("\n");
  assert.ok(lines.some((line) => line.includes('1 |   "😀"; bad')));
  assert.ok(lines.some((line) => line.endsWith("^^^")));
});
