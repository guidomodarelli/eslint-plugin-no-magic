# Performance baseline

Measured locally on 2026-09-07 with Node 24.14.1, ESLint 10.10.0,
Windows, and a 13th Gen Intel Core i7-1360P. Reproduce with `pnpm benchmark`.

| Literals | Parser only | Combined rule | Recommended rules |
| --- | ---: | ---: | ---: |
| 300 | 4.81 ms | 6.54 ms | 4.77 ms |
| 3,000 | 25.37 ms | 31.43 ms | 52.57 ms |
| 15,000 | 103.41 ms | 120.14 ms | 259.09 ms |

Each cell is the median of five runs after two warmups. A fresh Linter instance
parses the same deterministic generated source each run; timing includes parsing,
rule execution, and diagnostics. The script asserts expected diagnostic counts.
The recommended rules emit five diagnostics per block versus three for the
combined rule, so these modes do not perform identical work.

This is an initial baseline, not evidence of an optimization. Short timings are
sensitive to JIT warmup, garbage collection, and system load, which can place a
rule-enabled measurement below the parser-only measurement. No CI timing gate is
set. The fixture covers flat JavaScript comparisons and calls, not deeply nested
JSX, TypeScript parsing, or representative application repositories.
