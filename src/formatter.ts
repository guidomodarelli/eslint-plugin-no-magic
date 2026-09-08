/** @module formatter Renders ESLint diagnostics as terminal code frames without changing rule messages. */
import type { ESLint } from "eslint";

/** Controls terminal output independently from lint rule messages. */
export interface FormatterOptions {
  color?: boolean;
  unicode?: boolean;
  /** Auto-detects supported interactive terminals; disabled in CI by default. */
  hyperlinks?: boolean;
  /** File URLs are the default; vscode URLs open an exact editor position. */
  linkTarget?: "file" | "vscode";
}


import process from "node:process";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

/** Semantic ANSI styles used only when color output is enabled. */
const COLORS = { error: "\u001b[31;1m", warning: "\u001b[33;1m", detail: "\u001b[36m", reset: "\u001b[0m" };
/** Bounds the source excerpt so generated lines cannot flood the terminal. */
const EXCERPT_WIDTH = 100;
/** Segments grapheme clusters to keep emoji and combining marks aligned. */
const SEGMENTER = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * Escapes control characters before writing untrusted filenames, messages, or source.
 * @param value - Text from lint results.
 * @returns Printable single-line representation.
 */
function printable(value: string): string {
  // Control characters must be matched explicitly to prevent terminal escape injection.
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001f\u007f-\u009f]/gu, (character) =>
    character === "\t" ? "  " : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/**
 * Approximates terminal columns for graphemes, including common CJK and emoji.
 * @param value - Printable text.
 * @returns Display columns; terminal-specific ambiguous widths may vary.
 */
function columns(value: string): number {
  let width = 0;
  for (const { segment } of SEGMENTER.segment(value)) {
    const code = segment.codePointAt(0)!;
    width += /\p{Extended_Pictographic}/u.test(segment) ||
      (code >= 0x1100 && (code <= 0x115f || (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7af) || (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff01 && code <= 0xff60))) ? 2 : 1;
  }
  return width;
}

/**
 * Creates a formatter with explicit color and Unicode controls for terminals or CI.
 * @param options - Color, Unicode, hyperlink detection, and file/editor link target.
 * @returns Standard ESLint formatter accepting lint results.
 */
export function createFormatter({ color, unicode = true, hyperlinks, linkTarget = "file" }: FormatterOptions = {}) {
  if (!["file", "vscode"].includes(linkTarget)) throw new TypeError("formatter: linkTarget must be file or vscode");
  /**
   * Formats file diagnostics, source spans, and a compact severity summary.
   * @param results - ESLint lint results, optionally including source text.
   * @returns Terminal output; empty when no diagnostics exist.
   */
  return function format(results: ESLint.LintResult[]): string {
    const colored = color ?? (process.env.NO_COLOR === undefined &&
      (process.env.FORCE_COLOR !== undefined ? process.env.FORCE_COLOR !== "0" : Boolean(process.stdout.isTTY)));
    const linked = hyperlinks ?? (Boolean(process.stdout.isTTY) && !process.env.CI &&
      (Boolean(process.env.WT_SESSION) || ["vscode", "iTerm.app", "WezTerm", "ghostty"].includes(process.env.TERM_PROGRAM ?? "")));
    const glyphs = unicode ? { top: "╭─", bar: "│", bottom: "╰─", error: "✖", warning: "▲", caret: "━" }
      : { top: "+-", bar: "|", bottom: "+-", error: "x", warning: "!", caret: "^" };
    const lines: string[] = [];
    let errors = 0;
    let warnings = 0;
    /**
     * Applies a semantic color without leaking formatting into other output.
     * @param text - Safe output text.
     * @param tone - Color key.
     * @returns Styled or plain text.
     */
    const paint = (text: string, tone: keyof typeof COLORS) => colored ? `${COLORS[tone]}${text}${COLORS.reset}` : text;
    for (const result of results) {
      if (!result.messages.length) continue;
      lines.push(paint(`${glyphs.top} ${printable(result.filePath)}`, "detail"));
      const sourceLines = typeof result.source === "string" ? result.source.split(/\r?\n/u) : [];
      for (const message of result.messages) {
        const isError = message.fatal || message.severity === 2;
        if (isError) errors++; else warnings++;
        const tone = isError ? "error" : "warning";
        const line = Number.isInteger(message.line) && message.line > 0 ? message.line : 1;
        const column = Number.isInteger(message.column) && message.column > 0 ? message.column : 1;
        let location = `${line}:${column}`;
        if (linked && typeof result.filePath === "string" && isAbsolute(result.filePath)) {
          const fileUrl = pathToFileURL(result.filePath);
          const target = linkTarget === "vscode"
            ? `vscode://file${fileUrl.pathname}:${line}:${column}`
            : `${fileUrl.href}#L${line}:${column}`;
          const label = printable(`${result.filePath}:${line}:${column}`);
          location = `\u001b]8;;${target}\u001b\\${label}\u001b]8;;\u001b\\`;
        }
        lines.push(`${glyphs.bar} ${paint(`${isError ? glyphs.error : glyphs.warning} ${isError ? "ERROR" : "WARNING"}`, tone)} ${location}  ${printable(message.ruleId ?? "parse-error")}`);
        lines.push(`${glyphs.bar} ${printable(message.message)}`);
        const source = sourceLines[(message.line ?? 1) - 1];
        if (source !== undefined) {
          const start = Math.max(0, Math.min(source.length, (message.column ?? 1) - 1));
          const end = message.endLine && message.endLine !== message.line ? source.length :
            Math.min(source.length, Math.max(start + 1, (message.endColumn ?? start + 2) - 1));
          const windowStart = Math.max(0, start - Math.floor(EXCERPT_WIDTH / 2));
          const windowEnd = Math.min(source.length, windowStart + EXCERPT_WIDTH);
          const prefix = windowStart ? "..." : "";
          const excerpt = prefix + printable(source.slice(windowStart, windowEnd)) + (windowEnd < source.length ? "..." : "");
          const gutter = `${message.line ?? 1} | `;
          const offset = columns(prefix + printable(source.slice(windowStart, start)));
          const span = Math.max(1, columns(printable(source.slice(start, Math.min(end, windowEnd)))));
          lines.push(`${glyphs.bar} ${gutter}${excerpt}`);
          lines.push(`${glyphs.bar} ${" ".repeat(gutter.length + offset)}${paint(glyphs.caret.repeat(span), tone)}`);
          if ((message.endLine ?? 0) > message.line) lines.push(`${glyphs.bar} Span continues to ${message.endLine}:${message.endColumn ?? 1}`);
        }
        lines.push(glyphs.bar);
      }
      lines.push(`${glyphs.bottom} ${result.messages.length} diagnostic${result.messages.length === 1 ? "" : "s"}`, "");
    }
    if (!lines.length) return "";
    lines.push(`${errors} error${errors === 1 ? "" : "s"} · ${warnings} warning${warnings === 1 ? "" : "s"}`.replace(" · ", unicode ? " · " : " | "));
    return lines.join("\n") + "\n";
  };
}

/** Default formatter auto-detects color and uses Unicode decorations. */
export default createFormatter();
