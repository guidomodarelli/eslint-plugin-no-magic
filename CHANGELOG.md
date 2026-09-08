# Changelog

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
