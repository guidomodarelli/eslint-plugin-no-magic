/** @module constants/release Defines release validation patterns, packaging layout, and preparation commands. */

/** Accepts stable or prerelease semantic versions without a leading v. */
export const RELEASE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
/** Release notes intentionally allow only ASCII, including ordinary line breaks. */
// eslint-disable-next-line no-control-regex
export const NON_ASCII_PATTERN = /[^\x00-\x7f]/u;
/** Captures the first versioned changelog heading and its body. */
export const FIRST_CHANGELOG_ENTRY_PATTERN = /^## (\S+)(?:[^\n]*)\n([\s\S]*?)(?=^## |$(?![\s\S]))/mu;
/** Matches a nonempty bullet describing a change. */
export const CHANGELOG_CHANGE_ITEM_PATTERN = /^\s*- \S/mu;

/** Root directory of every entry inside an npm tarball. */
export const ARCHIVE_PACKAGE_PREFIX = "package/";
/** Extension of archives produced by `pnpm pack`. */
export const ARCHIVE_EXTENSION = ".tgz";
/** Manifest of the package itself, always packed. */
export const PACKAGE_MANIFEST_FILE = "package.json";
/** Manifest path inside a packed archive. */
export const PACKED_MANIFEST_PATH = `${ARCHIVE_PACKAGE_PREFIX}${PACKAGE_MANIFEST_FILE}`;
/** Trailing slash of directory entries in archive listings. */
export const TRAILING_SLASH_PATTERN = /\/$/u;
/** Leading `./` of export map targets. */
export const RELATIVE_PATH_PREFIX_PATTERN = /^\.\//u;

/** Changelog read to validate release notes. */
export const CHANGELOG_FILE = "CHANGELOG.md";
/** Local directory receiving prepared release artifacts. */
export const RELEASES_DIRECTORY = "releases";
/** Private directories that must never be published. */
export const PRIVATE_PATH_SEGMENTS = ["node_modules", RELEASES_DIRECTORY, "tests"];
/** Files every published artifact must contain besides its export targets. */
export const REQUIRED_PACKAGED_FILES = [PACKAGE_MANIFEST_FILE, "LICENSE", "README.md", CHANGELOG_FILE];

/** Prefix of the temporary staging directory created per preparation. */
export const STAGING_DIRECTORY_PREFIX = "prepare-";
/** Reproducible install and complete quality gates run before packing. */
export const RELEASE_PREPARATION_COMMANDS = ["pnpm install --frozen-lockfile", "pnpm check"];
/** Splits command output into lines regardless of platform line endings. */
export const LINE_BREAK_PATTERN = /\r?\n/u;
