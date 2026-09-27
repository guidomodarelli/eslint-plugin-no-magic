/** @module glob Matches relative file paths against minimal, dependency-free glob patterns. */
import {
  ANY_DIRECTORY_PREFIX_PATTERN,
  ANY_PATH_PATTERN,
  ANY_SEGMENT_CHARACTER_PATTERN,
  ANY_SEGMENT_CHARACTERS_PATTERN,
  GLOB_CHARACTER_WILDCARD,
  GLOB_DIRECTORY_WILDCARD,
  GLOB_RECURSIVE_WILDCARD,
  GLOB_SEGMENT_WILDCARD,
  REGEXP_SPECIAL_CHARACTER_PATTERN,
  WINDOWS_PATH_SEPARATOR_PATTERN,
} from "./constants/require-constants-location.js";

/**
 * Compiles `**`, `*`, and `?` globs; every other character matches literally.
 * @param pattern - Glob using forward slashes.
 * @returns Anchored expression matching whole relative paths.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index++) {
    if (pattern.startsWith(GLOB_DIRECTORY_WILDCARD, index)) {
      source += ANY_DIRECTORY_PREFIX_PATTERN;
      index += GLOB_DIRECTORY_WILDCARD.length - 1;
    } else if (pattern.startsWith(GLOB_RECURSIVE_WILDCARD, index)) {
      source += ANY_PATH_PATTERN;
      index += GLOB_RECURSIVE_WILDCARD.length - 1;
    } else if (pattern[index] === GLOB_SEGMENT_WILDCARD) {
      source += ANY_SEGMENT_CHARACTERS_PATTERN;
    } else if (pattern[index] === GLOB_CHARACTER_WILDCARD) {
      source += ANY_SEGMENT_CHARACTER_PATTERN;
    } else {
      source += REGEXP_SPECIAL_CHARACTER_PATTERN.test(pattern[index]) ? `\\${pattern[index]}` : pattern[index];
    }
  }
  // The expression is built from escaped configuration, never from linted source.
  return new RegExp(`^${source}$`, "u");
}

/**
 * Normalizes platform separators so globs behave identically on every OS.
 * @param path - Relative path using native separators.
 * @returns Path using forward slashes.
 */
export function toPosixPath(path: string): string {
  return path.replace(WINDOWS_PATH_SEPARATOR_PATTERN, "/");
}
