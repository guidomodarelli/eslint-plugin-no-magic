/** @module release-checks Validates release metadata and the public artifact contract. */
import {
  ARCHIVE_PACKAGE_PREFIX,
  CHANGELOG_CHANGE_ITEM_PATTERN,
  FIRST_CHANGELOG_ENTRY_PATTERN,
  NON_ASCII_PATTERN,
  PACKAGE_MANIFEST_FILE,
  PRIVATE_PATH_SEGMENTS,
  RELATIVE_PATH_PREFIX_PATTERN,
  RELEASE_VERSION_PATTERN,
  REQUIRED_PACKAGED_FILES,
  TRAILING_SLASH_PATTERN,
} from "./constants/release.js";

/**
 * Checks that the newest released changelog entry describes the package version.
 * @param {object} metadata - Parsed package manifest.
 * @param {string} changelog - Changelog text, deliberately ASCII for this repository.
 * @returns {void} Completes when metadata is coherent.
 * @throws {Error} When version, encoding, or release notes are inconsistent.
 */
export function validateReleaseMetadata(metadata, changelog) {
  if (!RELEASE_VERSION_PATTERN.test(metadata.version)) throw new Error("release: package.version must be a semantic version");
  if (NON_ASCII_PATTERN.test(changelog)) throw new Error("release: CHANGELOG.md must contain ASCII text only");
  const first = FIRST_CHANGELOG_ENTRY_PATTERN.exec(changelog);
  if (!first || first[1] !== metadata.version) throw new Error(`release: first changelog version must be ${metadata.version}`);
  if (!CHANGELOG_CHANGE_ITEM_PATTERN.test(first[2])) throw new Error("release: current changelog entry must describe at least one change");
}

/**
 * Validates archive paths and required files from public exports.
 * @param {object} metadata - Package manifest defining allowed files and exports.
 * @param {string[]} entries - Tar archive entry paths.
 * @returns {void} Completes when the archive matches the package contract.
 * @throws {Error} When private content is included or a public entrypoint is missing.
 */
export function validatePackageContents(metadata, entries) {
  const paths = entries.map((entry) => {
    if (!entry.startsWith(ARCHIVE_PACKAGE_PREFIX) || entry.includes("\\") || entry.split("/").includes("..")) {
      throw new Error(`release: invalid archive path ${entry}`);
    }
    return entry.slice(ARCHIVE_PACKAGE_PREFIX.length).replace(TRAILING_SLASH_PATTERN, "");
  }).filter(Boolean);
  const allowed = [...metadata.files, PACKAGE_MANIFEST_FILE];
  for (const path of paths) {
    if (path.split("/").some((part) => part.startsWith(".") || PRIVATE_PATH_SEGMENTS.includes(part)) ||
      !allowed.some((root) => path === root || path.startsWith(`${root}/`))) {
      throw new Error(`release: unexpected packaged file ${path}`);
    }
  }
  /**
   * Collects conditional export targets without importing or executing the package.
   * @param {*} value - Export map or target.
   * @returns {string[]} Relative public artifact paths.
   */
  const targets = (value) => typeof value === "string" ? [value.replace(RELATIVE_PATH_PREFIX_PATTERN, "")]
    : value && typeof value === "object" ? Object.values(value).flatMap(targets) : [];
  for (const required of [...REQUIRED_PACKAGED_FILES, ...targets(metadata.exports)]) {
    if (!paths.includes(required)) throw new Error(`release: missing packaged file ${required}`);
  }
}
