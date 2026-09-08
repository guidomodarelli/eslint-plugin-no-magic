# Performance baseline

Measured locally on 2026-09-07 with Node 26.8.1, ESLint 10.10.0,
Windows, and a 13th Gen Intel Core i7-1360P. Reproduce with `pnpm benchmark`.

| Fixture | Literals | Parser only | Combined rule | Recommended rules |
| --- | ---: | ---: | ---: | ---: |
| JavaScript | 300 | 3.86 ms | 4.11 ms | 3.14 ms |
| JavaScript | 3,000 | 21.08 ms | 24.20 ms | 26.32 ms |
| JavaScript | 15,000 | 91.19 ms | 106.07 ms | 107.92 ms |
| JSX | 300 | 4.17 ms | 3.25 ms | 3.47 ms |
| JSX | 3,000 | 36.49 ms | 41.19 ms | 40.11 ms |
| JSX | 15,000 | 184.11 ms | 224.31 ms | 204.15 ms |
| TypeScript | 300 | 9.70 ms | 8.41 ms | 5.94 ms |
| TypeScript | 3,000 | 56.67 ms | 66.30 ms | 64.11 ms |
| TypeScript | 15,000 | 323.75 ms | 341.01 ms | 339.79 ms |
| Nested | 300 | 40.36 ms | 40.24 ms | 53.91 ms |
| Nested | 3,000 | 406.87 ms | 412.86 ms | 410.31 ms |
| Nested | 15,000 | 2,371.14 ms | 2,402.14 ms | 2,439.36 ms |

Each cell is the median of five runs after two warmups. Every run uses a fresh
Linter instance and includes parsing, scope analysis, rule execution, and
construction of diagnostics. Every run asserts successful parsing and the
expected diagnostic count. Both rule modes now emit three diagnostics per block
because the recommended preset omits duplicate diagnostics on contract positions.
Parser-only mode uses the same parser settings but emits no diagnostics.

JavaScript exercises comparisons, analytics calls, and generic duplicates. JSX
adds rendered elements, attribute comparisons, and event handlers. TypeScript
uses the real typescript-eslint parser with `as` and `satisfies` expressions.
The nested fixture wraps each event value in 40 conditional branches; depth is
fixed while block count scales. Literal counts do not measure total AST size.

These synthetic fixtures are a baseline, not evidence of an optimization or a
controlled comparison with earlier results. Short timings are sensitive to JIT,
garbage collection, and system load. Other validation commands ran during the
tail of this local benchmark, so nested-case timings may include contention.
No CI timing threshold is set. Real application repositories remain unmeasured.
