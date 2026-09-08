/** @module formatter Provides terminal formatting options and the ESLint formatter contract. */
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

/** Creates a formatter; color defaults to terminal detection with NO_COLOR support. */
export function createFormatter(options?: FormatterOptions): (results: ESLint.LintResult[]) => string;
/** Formats lint results using default terminal presentation. */
declare const formatter: (results: ESLint.LintResult[]) => string;
export default formatter;
