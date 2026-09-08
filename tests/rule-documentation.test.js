/** @file Verifies rule documentation metadata and the examples' public behavior. */
import assert from "node:assert/strict";
import { URL } from "node:url";
import { it } from "vitest";
import { Linter } from "eslint";
import plugin from "../index.js";

for (const [name, rule] of Object.entries(plugin.rules)) {
  it(`should expose a dedicated documentation URL for ${name}`, () => {
    const url = new URL(rule.meta.docs.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "github.com");
    assert.equal(url.pathname, `/guidomodarelli/eslint-plugin-no-magic/blob/main/docs/rules/${name}.md`);
  });
}

for (const [name, valid, invalid, count] of [
  ["no-magic-contracts", 'const PENDING = "pending"; status === PENDING;', 'status === "pending";', 1],
  ["no-duplicate-strings", 'const PENDING = "pending"; label(PENDING); label(PENDING); label(PENDING);', 'label("pending"); label("pending"); label("pending");', 3],
  ["prefer-existing-constant", 'const PENDING = "pending"; status === PENDING;', 'const PENDING = "pending"; status === "pending";', 1],
  ["no-duplicate-constants", 'const TIMEOUT = 5000; const PRIMARY = TIMEOUT; const SECONDARY = TIMEOUT;', 'const PRIMARY = 5000; const SECONDARY = 5000;', 1],
]) {
  it(`should implement the documented basic examples for ${name}`, () => {
    const config = [{ plugins: { "no-magic": plugin }, rules: { [`no-magic/${name}`]: "warn" } }];
    assert.equal(new Linter().verify(valid, config).length, 0);
    assert.equal(new Linter().verify(invalid, config).length, count);
  });
}
