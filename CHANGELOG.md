# Changelog

## 1.8.1 - Unreleased

- Build once per complete check, CI and release flow.
- Keep standalone test, typecheck and pack commands self-contained.

## 1.8.0 - Unreleased

- Migrate plugin implementation and formatter to strict TypeScript source.
- Build ESM JavaScript and public declarations into ignored dist output.
- Preserve package imports and validate the compiled tarball and consumer types.
- Update build, test, benchmark, CI and release workflows for compiled output.

## 1.7.5 - Unreleased

- Document every rule with examples, options, defaults and conservative boundaries.
- Expose documentation URLs through ESLint metadata and include pages in the package.

## 1.7.4 - Unreleased

- Verify overlapping file configs, severity overrides and advisory inheritance.
- Make explicit false advisory settings disable previously enabled rules.

## 1.7.3 - Unreleased

- Audit destructuring, imports, expressions and closure visibility for reuse suggestions.
- Stop outer searches across hoisted function declarations and dynamic with scopes.
- Keep safe local and expression-closure candidates covered by regressions.

## 1.7.2 - Unreleased

- Test minimum Node 26.0.0 and current Node 26.x on both CI operating systems.
- Verify local minimum-runtime tests, type checks, lint and frozen installation.

## 1.7.1 - Unreleased

- Measure retained heap and sampled peaks across unique files in isolated processes.
- Record parser-only and optional-rule baselines with diagnostic count checks.

## 1.7.0 - Unreleased

- Add safe terminal hyperlinks with file and editor position targets.
- Preserve plain CI output and explicit hyperlink opt-out.

## 1.6.0 - Unreleased

- Configure optional constant rules through createConfig with shared contracts.
- Preserve opt-in defaults, independent severity and exclusion options.

## 1.5.3 - Unreleased

- Index visible string constants by lexical scope and value per rule instance.
- Preserve temporal visibility, shadowing and candidate preference with cached lookup.
- Verify identical diagnostics and record measured before/after performance.

## 1.5.2 - Unreleased

- Add equal-value and shadowed-candidate benchmark scenarios.
- Capture complete diagnostic hashes for before/after regression comparison.

## 1.5.1 - Unreleased

- Add checked benchmarks for optional constant rules, including misses and nested scopes.
- Record per-rule ESLint statistics and a reproducible baseline without algorithm changes.

## 1.5.0 - Unreleased

- Add exact constant-name exclusions to both advisory constant rules.
- Preserve lexical shadowing and allow combined name/value exclusions.

## 1.4.0 - Unreleased

- Add independent JSX, SVG, and const-definition exemptions for duplicate strings.
- Preserve existing defaults and structural exclusions.

## 1.3.1 - Unreleased

- Add release metadata and archive checks, run quality gates, and preserve local artifacts in content-hashed directories without publishing.

## 1.3.0 - Unreleased

- Include first duplicate locations and a terminal formatter with colors, Unicode frames, safe text handling, and ASCII output.

## 1.2.0 - Unreleased

- Add visible-constant reuse and same-scope primitive duplication checks with public types and real parser tests.

## 1.1.1 - Unreleased

- Treat imported packages uniformly while preserving syntax-based exclusions and regression coverage.

## 1.1.0 - Unreleased

- Add createConfig to synchronize contract definitions, isolate option copies, and configure independent severities.

## 1.0.0 - Unreleased

- Remove the deprecated `no-magic-strings` rule and its old module.
- Remove `NoMagicStringsOptions`; use the independent public option types.
- Migrate all regression tests and benchmark modes to independent rules.
- Keep the recommended preset and magic-number defaults.

## 0.2.2 - Unreleased

- Deprecate `no-magic-strings` through ESLint metadata and TypeScript documentation.
- Keep combined behavior available until its removal in 1.0.0.
- Identify `no-magic-contracts` and `no-duplicate-strings` as replacements.

## 0.2.0 - Unreleased

- Add independent `no-magic-contracts` and `no-duplicate-strings` rules.
- Configure the recommended preset with contract errors and duplicate warnings.
- Keep the combined `no-magic-strings` rule for existing configurations.
- Explain comparison, switch, action, storage, navigation, and feature-flag diagnostics.
- Follow TypeScript wrappers, conditional value branches, and computed static names.
- Preserve JSX copy, real directives, named constants, and resolved next/font options.
- Count all eligible duplicates while avoiding duplicate messages in the combined rule.
- Inspect only storage keys and explicitly named router arguments by default.
- Add public TypeScript declarations, packed-consumer tests, and a repeatable benchmark.
- Test ESLint 10.10.0; bound the supported peer range to this release line.
- Adopt pnpm 12, Vitest 5, and TypeScript 7 with the TS6 parser compatibility package.
- Require Node `^26.0.0`.

See [the migration guide](MIGRATION.md) before upgrading from 0.1.x.
