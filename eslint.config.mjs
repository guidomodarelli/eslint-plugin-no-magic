/** @file Lints JavaScript tooling and typed implementation; TypeScript checks unused bindings. */
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tsParser },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-restricted-syntax": ["error", { selector: "TSAnyKeyword", message: "Use a concrete type or narrow unknown." }],
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "releases/**"],
  },
];
