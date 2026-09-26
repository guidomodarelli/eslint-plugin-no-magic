/** @module constants/formatter Defines terminal styles, glyphs, detection keys, and layout bounds of the code-frame formatter. */
import type { FormatterOptions } from "../formatter.js";

/** Link targets accepted by the formatter. */
type LinkTarget = NonNullable<FormatterOptions["linkTarget"]>;

/** Link targets: file URLs by default, vscode URLs to open an exact editor position. */
export const FILE_LINK_TARGET = "file" satisfies LinkTarget;
export const VSCODE_LINK_TARGET = "vscode" satisfies LinkTarget;
export const LINK_TARGETS: readonly string[] = [FILE_LINK_TARGET, VSCODE_LINK_TARGET] satisfies readonly LinkTarget[];

/** Semantic ANSI styles used only when color output is enabled. */
export const COLORS = { error: "\u001b[31;1m", warning: "\u001b[33;1m", detail: "\u001b[36m", reset: "\u001b[0m" } as const;

/** OSC 8 hyperlink delimiters understood by supporting terminals. */
export const HYPERLINK_OPEN = "\u001b]8;;";
export const HYPERLINK_TERMINATOR = "\u001b\\";
/** Editor URL scheme and file-URL line fragment used by hyperlinks. */
export const VSCODE_FILE_URL_PREFIX = "vscode://file";
export const FILE_URL_LINE_FRAGMENT = "#L";

/** Decorations for Unicode-capable terminals and plain ASCII output. */
export const GLYPHS = {
  unicode: { top: "╭─", bar: "│", bottom: "╰─", error: "✖", warning: "▲", caret: "━" },
  ascii: { top: "+-", bar: "|", bottom: "+-", error: "x", warning: "!", caret: "^" },
} as const;

/** Separators between error and warning totals in the summary line. */
export const SUMMARY_SEPARATORS = { unicode: " · ", ascii: " | " } as const;

/** Environment variables consulted for color and hyperlink auto-detection. */
export const ENVIRONMENT_VARIABLES = {
  noColor: "NO_COLOR",
  forceColor: "FORCE_COLOR",
  continuousIntegration: "CI",
  windowsTerminalSession: "WT_SESSION",
  terminalProgram: "TERM_PROGRAM",
} as const;
/** FORCE_COLOR value that disables color. */
export const FORCE_COLOR_DISABLED = "0";
/** TERM_PROGRAM values known to render OSC 8 hyperlinks. */
export const HYPERLINK_TERMINAL_PROGRAMS: readonly string[] = ["vscode", "iTerm.app", "WezTerm", "ghostty"];

/** ESLint severity level reported as an error. */
export const ERROR_SEVERITY_LEVEL = 2;
/** Rule identifier shown for parser failures, which have no rule. */
export const PARSE_ERROR_RULE_ID = "parse-error";

/** Bounds the source excerpt so generated lines cannot flood the terminal. */
export const EXCERPT_WIDTH = 100;

/** Control characters must be matched explicitly to prevent terminal escape injection. */
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/gu;
/** Splits source text into lines regardless of platform line endings. */
export const LINE_BREAK_PATTERN = /\r?\n/u;

/** Locale and granularity used to segment grapheme clusters. */
export const GRAPHEME_SEGMENTER_LOCALE = "en";
export const GRAPHEME_SEGMENTER_OPTIONS: Intl.SegmenterOptions = { granularity: "grapheme" };
/** Emoji render as two terminal columns. */
export const PICTOGRAPHIC_PATTERN = /\p{Extended_Pictographic}/u;
/** Inclusive code point ranges of common CJK and full-width characters rendered as two columns. */
export const WIDE_CODE_POINT_RANGES: ReadonlyArray<readonly [start: number, end: number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7af],
  [0xf900, 0xfaff],
  [0xff01, 0xff60],
];
/** Terminal columns occupied by wide graphemes; other graphemes occupy one. */
export const WIDE_GRAPHEME_COLUMNS = 2;
