/** @file Measures end-to-end lint time on deterministic generated JavaScript, JSX, TypeScript, and nested expressions. */
import console from "node:console";
import assert from "node:assert/strict";
import { cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";
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
  { name: "recommended", config: plugin.configs.recommended, diagnosticsPerBlock: 3 },
];

/** Nesting is fixed so fixture size and AST depth vary independently. */
const EXPRESSION_DEPTH = 40;
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
        { files: ["**/*.{js,jsx,ts}"], languageOptions: fixture.languageOptions },
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
      console.log(JSON.stringify({ fixture: fixture.name, blocks, literals: blocks * 3, mode: mode.name, medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)) }));
    }
  }
}
