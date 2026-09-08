# Constant reuse optimization

Measured on 2026-09-08T03:11:50.573Z with Node v26.8.1, ESLint 10.10.0,
win32, 13th Gen Intel(R) Core(TM) i7-1360P.

The same benchmark ran before and after the scope/value index change. Each cell
is a median of five measured runs after two warmups. This table uses 1,000
lookups and the reuse-only mode; every fixture contains 2,000 const definitions.

| Scenario | Rule before | Rule after | End-to-end before | End-to-end after |
| --- | ---: | ---: | ---: | ---: |
| wide-hit | 97.324 ms | 3.419 ms | 164.415 ms | 66.556 ms |
| wide-miss | 225.254 ms | 2.729 ms | 311.043 ms | 113.751 ms |
| nested | 117.197 ms | 4.103 ms | 214.990 ms | 65.039 ms |
| same-value | 6.644 ms | 9.699 ms | 121.964 ms | 138.942 ms |
| shadowed-hit | 185.422 ms | 4.245 ms | 310.563 ms | 146.731 ms |
| shadowed-miss | 237.640 ms | 2.631 ms | 388.666 ms | 74.395 ms |

## Behavior checks

All 72 scenario/size/mode combinations retain the same complete diagnostic hash.
This compares text, location, order, severity, and rule ID, not just counts.
Additional tests cover temporal shadowing, changing declaration availability,
excluded names, equal-value preference, and repeated lint calls across files.

## Implementation

Each rule instance lazily indexes its own scope graph by string value. Candidate
visibility uses the complete binding maps, including parameters and declarations
not yet initialized. A cache keyed by starting scope and value avoids repeating
visibility work. Dominated candidates are removed from the availability list;
binary search preserves the first eligible declaration at each source position.
No indexes are shared across files or rule instances. Initial indexing and
visibility construction still cost time and memory; no universal constant-time
claim or heap measurement is made.

## Reproduction and limits

- Before: `pnpm benchmark:constants --baseline` on the unoptimized implementation.
- After: `pnpm benchmark:constants --compare` on the optimized implementation.
- Raw data: [before](constants-before.json), [after](constants-results.json).

Profiles include hits, misses, 20 nested scopes, repeated equal values, and
parameter shadowing. Cases run sequentially; this is a local synthetic benchmark,
not a controlled hardware experiment. JIT, GC, CPU scaling and background load
affect timings. Small-input cases may be dominated by index setup or noise.
The measured improvement applies to these scenarios, not every consumer.
