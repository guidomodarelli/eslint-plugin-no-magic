# Memory profile

Measured 2026-09-08T03:20:13.271Z with Node v26.8.1, ESLint 10.10.0 on win32.

Each mode runs in its own process with --expose-gc. One ESLint instance handles
five warmup files followed by batches totaling 25, 50, and 100 unique files.
Each file has eight scopes and 25 unique values per scope, plus repeated const
definitions. Every lint verifies its expected diagnostic count.

| Mode | Files | Heap after GC | Retained delta | Sampled peak heap |
| --- | ---: | ---: | ---: | ---: |
| parser-only | 25 | 15.50 MiB | 0.28 MiB | 79.05 MiB |
| parser-only | 50 | 15.57 MiB | 0.35 MiB | 90.54 MiB |
| parser-only | 100 | 15.68 MiB | 0.46 MiB | 119.06 MiB |
| reuse | 25 | 15.93 MiB | 0.27 MiB | 108.36 MiB |
| reuse | 50 | 16.02 MiB | 0.36 MiB | 108.36 MiB |
| reuse | 100 | 16.11 MiB | 0.45 MiB | 123.37 MiB |
| both | 25 | 15.91 MiB | 0.17 MiB | 106.50 MiB |
| both | 50 | 15.99 MiB | 0.25 MiB | 106.50 MiB |
| both | 100 | 16.05 MiB | 0.30 MiB | 110.68 MiB |

The retained delta is relative to the warmed, post-GC baseline of that process.
Peak heap is sampled after lint operations and can miss allocation peaks inside
a lint call. RSS and other counters are included in [raw results](memory-results.json).
Lint results are not retained between files. Scope indexes remain file-local.

Small retained growth also occurs in parser-only mode and may include ESLint
configuration caches, JIT state, and runtime metadata. This sample does not show
AST-sized retention proportional to file count, but is not proof that leaks are
impossible. No hard memory limit is enforced. Broader workloads, longer runs,
and heap snapshots would be required for a leak investigation.

Reproduce with `pnpm benchmark:memory`. Each invocation rewrites the raw results;
this report records the run above.
