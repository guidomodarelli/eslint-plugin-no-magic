/** @module release-checks Validates release metadata and the public artifact contract. */

/** Accepts stable or prerelease semantic versions without a leading v. */
const RELEASE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

/**
 * Checks that the first versioned changelog entry describes the package version.
 * @param {object} metadata - Parsed package manifest.
 * @param {string} changelog - Changelog text, deliberately ASCII for this repository.
 * @returns {void} Completes when metadata is coherent.
 * @throws {Error} When version, encoding, or release notes are inconsistent.
 */
export function validateReleaseMetadata(metadata, changelog) {
  if (!RELEASE_VERSION.test(metadata.version)) throw new Error("release: package.version must be a semantic version");
  // Release notes intentionally allow only ASCII, including ordinary line breaks.
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/u.test(changelog)) throw new Error("release: CHANGELOG.md must contain ASCII text only");
  const first = /^## (\S+)(?:[^\n]*)\n([\s\S]*?)(?=^## |$(?![\s\S]))/mu.exec(changelog);
  if (!first || first[1] !== metadata.version) throw new Error(`release: first changelog version must be ${metadata.version}`);
  if (!/^\s*- \S/mu.test(first[2])) throw new Error("release: current changelog entry must describe at least one change");
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
    if (!entry.startsWith("package/") || entry.includes("\\") || entry.split("/").includes("..")) {
      throw new Error(`release: invalid archive path ${entry}`);
    }
    return entry.slice("package/".length).replace(/\/$/u, "");
  }).filter(Boolean);
  const allowed = [...metadata.files, "package.json"];
  for (const path of paths) {
    if (path.split("/").some((part) => part.startsWith(".") || ["node_modules", "releases", "tests"].includes(part)) ||
      !allowed.some((root) => path === root || path.startsWith(`${root}/`))) {
      throw new Error(`release: unexpected packaged file ${path}`);
    }
  }
  /**
   * Collects conditional export targets without importing or executing the package.
   * @param {*} value - Export map or target.
   * @returns {string[]} Relative public artifact paths.
   */
  const targets = (value) => typeof value === "string" ? [value.replace(/^\.\//u, "")]
    : value && typeof value === "object" ? Object.values(value).flatMap(targets) : [];
  for (const required of ["package.json", "LICENSE", "README.md", "CHANGELOG.md", ...targets(metadata.exports)]) {
    if (!paths.includes(required)) throw new Error(`release: missing packaged file ${required}`);
  }
}
