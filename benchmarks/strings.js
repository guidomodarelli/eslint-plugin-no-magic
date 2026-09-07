/** @file Measures end-to-end lint time on deterministic generated JavaScript files. */
import console from "node:console";
import assert from "node:assert/strict";
import { cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { Linter } from "eslint";
import plugin from "../index.js";

/** Counts of generated blocks; each contributes three candidate strings. */
const BLOCK_COUNTS = [100, 1000, 5000];
/** Warmups reduce first-run effects; measured samples are summarized by median. */
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;
/** Compares parser-only cost, legacy analysis, and two independent policies. */
const MODES = [
  { name: "parser-only", config: [{}], diagnosticsPerBlock: 0 },
  { name: "combined", config: [{ plugins: { "no-magic": plugin }, rules: { "no-magic/no-magic-strings": "error" } }], diagnosticsPerBlock: 3 },
  { name: "recommended", config: plugin.configs.recommended, diagnosticsPerBlock: 5 },
];

console.log(JSON.stringify({ node: process.version, eslint: Linter.version, os: platform(), cpu: cpus()[0]?.model, samples: MEASURED_RUNS }));
for (const blocks of BLOCK_COUNTS) {
  const code = 'if (status === "pending") track("event"); label("shared");\n'.repeat(blocks);
  for (const mode of MODES) {
    const samples = [];
    for (let run = 0; run < WARMUP_RUNS + MEASURED_RUNS; run++) {
      const linter = new Linter();
      const started = performance.now();
      const messages = linter.verify(code, mode.config);
      const elapsed = performance.now() - started;
      assert.equal(messages.length, blocks * mode.diagnosticsPerBlock);
      if (run >= WARMUP_RUNS) samples.push(elapsed);
    }
    samples.sort((left, right) => left - right);
    console.log(JSON.stringify({ blocks, literals: blocks * 3, mode: mode.name, medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)) }));
  }
}
