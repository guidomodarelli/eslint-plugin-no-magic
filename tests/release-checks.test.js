/** @file Validates public release metadata and archive contracts using input fixtures. */
import assert from "node:assert/strict";
import { it } from "vitest";
import { validatePackageContents, validateReleaseMetadata } from "../scripts/release-checks.js";

it("should accept matching release notes and reject missing or conflicting entries", () => {
  validateReleaseMetadata({ version: "1.0.0" }, "# Changelog\n\n## 1.0.0 - Unreleased\n\n- Add feature.\n\n## 0.9.0\n- Earlier.\n");
  for (const notes of ["## 0.9.0\n- Earlier.", "## 1.0.0\n", "## 1.0.0\n- Unicode \u2014 text."]) {
    assert.throws(() => validateReleaseMetadata({ version: "1.0.0" }, notes), /release:/);
  }
  assert.throws(() => validateReleaseMetadata({ version: "next" }, ""), /semantic version/);
  for (const version of ["1.0.0-..", "1.0.0-01", "01.0.0"]) {
    assert.throws(() => validateReleaseMetadata({ version }, ""), /semantic version/);
  }
  validateReleaseMetadata({ version: "1.0.0-rc.1" }, "## 1.0.0-rc.1\n- Preview.\n");
});

it("should require all public exports and reject private files or traversal", () => {
  const metadata = { files: ["index.js", "index.d.ts", "LICENSE", "README.md", "CHANGELOG.md"], exports: { ".": { types: "./index.d.ts", default: "./index.js" } } };
  const entries = [...metadata.files, "package.json"].map((file) => `package/${file}`);
  validatePackageContents(metadata, entries);
  assert.throws(() => validatePackageContents(metadata, entries.filter((entry) => !entry.endsWith("index.d.ts"))), /missing packaged file/);
  for (const extra of ["package/.env", "package/../outside", "package/tests/test.js", "outside/index.js"]) {
    assert.throws(() => validatePackageContents(metadata, [...entries, extra]), /release:/);
  }
});
