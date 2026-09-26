/** @file Measures end-to-end lint time on deterministic generated JavaScript, JSX, TypeScript, and nested expressions. */
import console from "node:console";
import assert from "node:assert/strict";
import { cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";
import plugin from "../dist/index.js";
import { MEASURED_RUNS, PARSER_ONLY_MODE, WARMUP_RUNS } from "./constants/shared.js";
import { BLOCK_COUNTS, EXPRESSION_DEPTH, FIXTURE_FILES_GLOB, LITERALS_PER_BLOCK, RECOMMENDED_DIAGNOSTICS_PER_BLOCK } from "./constants/strings-benchmark.js";

/** Compares parser-only cost and the recommended preset, which reports every block literal. */
const MODES = [
  { name: PARSER_ONLY_MODE, config: [{}], diagnosticsPerBlock: 0 },
  { name: "recommended", config: plugin.configs.recommended, diagnosticsPerBlock: RECOMMENDED_DIAGNOSTICS_PER_BLOCK },
];

/** Each fixture contributes two contracts and one generic duplicate per block. */
const FIXTURES = [
  { name: "javascript", filename: "fixture.js", languageOptions: {},
    block: 'if (status === "pending") track("event"); label("shared");\n' },
  { name: "jsx", filename: "fixture.jsx", languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    block: '<Button disabled={status === "pending"} onClick={() => track("event")}>{label("shared")}</Button>;\n' },
  { name: "typescript", filename: "fixture.ts", languageOptions: { parser: tsParser },
    block: 'if (status === ("pending" as const)) track("event" satisfies string); label("shared" as string);\n' },
  { name: "nested", filename: "fixture.js", languageOptions: {},
    block: `track(${"ready ? (".repeat(EXPRESSION_DEPTH)}"event"${") : fallback".repeat(EXPRESSION_DEPTH)}); status === "pending"; label("shared");\n` },
];

console.log(JSON.stringify({ node: process.version, eslint: Linter.version, os: platform(), cpu: cpus()[0]?.model, samples: MEASURED_RUNS, depth: EXPRESSION_DEPTH }));
for (const fixture of FIXTURES) {
  for (const blocks of BLOCK_COUNTS) {
    const code = fixture.block.repeat(blocks);
    for (const mode of MODES) {
      const config = [
        { files: [FIXTURE_FILES_GLOB], languageOptions: fixture.languageOptions },
        ...mode.config,
      ];
      const samples = [];
      for (let run = 0; run < WARMUP_RUNS + MEASURED_RUNS; run++) {
        const linter = new Linter();
        const started = performance.now();
        const messages = linter.verify(code, config, { filename: fixture.filename });
        const elapsed = performance.now() - started;
        assert.ok(messages.every((message) => !message.fatal), "Fixture must parse successfully");
        assert.equal(messages.length, blocks * mode.diagnosticsPerBlock, `${fixture.name}/${mode.name}`);
        if (run >= WARMUP_RUNS) samples.push(elapsed);
      }
      samples.sort((left, right) => left - right);
      console.log(JSON.stringify({ fixture: fixture.name, blocks, literals: blocks * LITERALS_PER_BLOCK, mode: mode.name, medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)) }));
    }
  }
}
