# Optional constant rules: performance baseline

Measured at 2026-09-08T03:04:14.819Z with Node v26.8.1, ESLint 10.10.0,
win32, 13th Gen Intel(R) Core(TM) i7-1360P.

Run `pnpm benchmark:constants` to reproduce. Raw measurements are saved in
[constants-results.json](constants-results.json).

| Scenario | Candidates | Parser only | Reuse only | Duplicates only | Both |
| --- | ---: | ---: | ---: | ---: | ---: |
| wide-hit | 100 | 7.194 ms | 6.718 ms | 7.198 ms | 5.977 ms |
| wide-hit | 500 | 28.919 ms | 47.393 ms | 27.408 ms | 41.208 ms |
| wide-hit | 1000 | 59.801 ms | 116.640 ms | 120.966 ms | 222.043 ms |
| wide-miss | 100 | 8.644 ms | 11.330 ms | 7.243 ms | 14.666 ms |
| wide-miss | 500 | 52.468 ms | 117.678 ms | 53.624 ms | 78.251 ms |
| wide-miss | 1000 | 108.612 ms | 359.840 ms | 104.960 ms | 303.587 ms |
| nested | 100 | 5.844 ms | 10.551 ms | 7.779 ms | 10.208 ms |
| nested | 500 | 43.733 ms | 72.241 ms | 49.459 ms | 71.603 ms |
| nested | 1000 | 93.599 ms | 197.732 ms | 104.262 ms | 204.214 ms |

Each fixture has twice as many declarations as candidates and one lookup per
candidate. `wide-hit` finds distinct preceding values; `wide-miss` scans without
finding a matching value; `nested` performs hits through 20 lexical scopes.
One repeated definition per candidate also exercises the duplicate rule.

Each cell is the median of five runs after two warmups. A new ESLint instance
is used for each run, with its native stats enabled. End-to-end timings include
configuration, parsing, traversal, and diagnostics. The JSON records separate
parse and per-rule medians; medians should not be added across runs. Every run
asserts zero parse failures and exact diagnostic counts for each enabled rule.

The reuse rule took 254.950 ms of rule time for 1,000 wide misses in its solo
run, versus 57.576 ms for wide hits. The implementation scans scope variables
for each lookup; the repeated scans can produce quadratic work as both the
number of definitions and lookups grow. This baseline identifies that cost;
it does not claim an optimization. The duplicate rule uses scope-local maps.

These are synthetic JavaScript fixtures, not representative application timings.
JIT, GC, instrumentation, CPU scaling and background load affect results. No CI
performance threshold is imposed and no algorithm was changed for this benchmark.
