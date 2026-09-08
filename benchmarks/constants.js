/** @file Profiles optional constant rules using real ESLint timing and checked diagnostics. */
import assert from "node:assert/strict";
import console from "node:console";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { URL } from "node:url";
import { ESLint } from "eslint";
import plugin from "../dist/index.js";

/** Candidate counts intentionally vary independently of lexical depth. */
const CANDIDATE_COUNTS = [100, 500, 1000];
const SCOPE_DEPTH = 20;
const WARMUPS = 2;
const SAMPLES = 5;
/** Public rule IDs used for configuration, statistics, and diagnostic assertions. */
const REUSE_RULE = "no-magic/prefer-existing-constant";
const DUPLICATE_RULE = "no-magic/no-duplicate-constants";
const MODES = [
  { name: "parser-only", rules: {} },
  { name: "reuse", rules: { [REUSE_RULE]: "warn" } },
  { name: "duplicates", rules: { [DUPLICATE_RULE]: "warn" } },
  { name: "both", rules: { [REUSE_RULE]: "warn", [DUPLICATE_RULE]: "warn" } },
];

/**
 * Generates preceding const definitions and either matching or absent contract values.
 * @param {number} count - Unique values plus the same number of repeated definitions.
 * @param {string} scenario - Wide matches, misses, or nested lookups.
 * @returns {string} Complete JavaScript source.
 */
function fixture(count, scenario) {
  const declarations = Array.from({ length: count }, (_, index) =>
    `const VALUE_${index} = "value_${index}"; const SHARED_${index} = "shared";`).join("\n");
  const sharedValue = scenario === "same-value" || scenario === "shadowed-hit";
  const expressions = Array.from({ length: count }, (_, index) =>
    `status === "${sharedValue ? "shared" : `${scenario === "wide-miss" ? "missing" : "value"}_${index}`}";`).join("\n");
  if (scenario === "shadowed-hit" || scenario === "shadowed-miss") {
    const parameterCount = scenario === "shadowed-hit" ? count - 1 : count;
    const parameters = Array.from({ length: parameterCount }, (_, index) =>
      `${scenario === "shadowed-hit" ? "SHARED" : "VALUE"}_${index}`).join(",");
    return `${declarations}\nconst lookup = (${parameters}) => { ${expressions} };`;
  }
  return scenario === "nested" ? `${declarations}\n${"{ let local;".repeat(SCOPE_DEPTH)}\n${expressions}\n${"}".repeat(SCOPE_DEPTH)}`
    : `${declarations}\n${expressions}`;
}

/**
 * Computes the median without mutating the supplied samples.
 * @param {number[]} values - Timing samples in milliseconds.
 * @returns {number} Median milliseconds rounded for reproducible reporting.
 */
function median(values) {
  return Number([...values].sort((left, right) => left - right)[Math.floor(values.length / 2)].toFixed(3));
}

const report = {
  measuredAt: new Date().toISOString(), node: process.version, eslint: ESLint.version,
  os: platform(), cpu: cpus()[0]?.model, warmups: WARMUPS, samples: SAMPLES, scopeDepth: SCOPE_DEPTH,
  measurements: [],
};
for (const scenario of ["wide-hit", "wide-miss", "nested", "same-value", "shadowed-hit", "shadowed-miss"]) {
  for (const candidates of CANDIDATE_COUNTS) {
    const code = fixture(candidates, scenario);
    for (const mode of MODES) {
      const elapsedSamples = [];
      let diagnosticsHash;
      const parseSamples = [];
      const reuseSamples = [];
      const duplicateSamples = [];
      for (let run = 0; run < WARMUPS + SAMPLES; run++) {
        const eslint = new ESLint({ overrideConfigFile: true, stats: true, overrideConfig: [{
          plugins: { "no-magic": plugin }, rules: mode.rules,
        }] });
        const started = performance.now();
        const [result] = await eslint.lintText(code, { filePath: "benchmark.js" });
        const elapsed = performance.now() - started;
        const expectedReuse = mode.rules[REUSE_RULE] && !["wide-miss", "shadowed-miss"].includes(scenario) ? candidates : 0;
        const expectedDuplicates = mode.rules[DUPLICATE_RULE] ? candidates - 1 : 0;
        assert.equal(result.fatalErrorCount, 0);
        assert.equal(result.messages.filter((message) => message.ruleId === REUSE_RULE).length, expectedReuse);
        assert.equal(result.messages.filter((message) => message.ruleId === DUPLICATE_RULE).length, expectedDuplicates);
        assert.equal(result.messages.length, expectedReuse + expectedDuplicates);
        const currentHash = createHash("sha256").update(JSON.stringify(result.messages)).digest("hex");
        if (diagnosticsHash) assert.equal(currentHash, diagnosticsHash, "Diagnostics must be deterministic across samples");
        diagnosticsHash = currentHash;
        const timing = result.stats.times.passes[0];
        if (run >= WARMUPS) {
          elapsedSamples.push(elapsed);
          parseSamples.push(timing.parse.total);
          reuseSamples.push(timing.rules?.[REUSE_RULE]?.total ?? 0);
          duplicateSamples.push(timing.rules?.[DUPLICATE_RULE]?.total ?? 0);
        }
      }
      const measurement = { scenario, candidates, declarations: candidates * 2, lookups: candidates, mode: mode.name, diagnosticsHash,
        medianMs: median(elapsedSamples), parseMs: median(parseSamples), reuseMs: median(reuseSamples), duplicatesMs: median(duplicateSamples) };
      report.measurements.push(measurement);
      console.log(JSON.stringify(measurement));
    }
  }
}
if (process.argv.includes("--compare")) {
  const baseline = JSON.parse(readFileSync(new URL("./constants-before.json", import.meta.url), "utf8"));
  assert.equal(report.measurements.length, baseline.measurements.length);
  for (const measurement of report.measurements) {
    const previous = baseline.measurements.find((item) => item.scenario === measurement.scenario &&
      item.candidates === measurement.candidates && item.mode === measurement.mode);
    assert.ok(previous, "Every scenario must have a baseline");
    assert.equal(measurement.diagnosticsHash, previous.diagnosticsHash, "Optimization must preserve complete diagnostics");
  }
}
const destination = process.argv.includes("--baseline") ? "./constants-before.json" : "./constants-results.json";
writeFileSync(new URL(destination, import.meta.url), JSON.stringify(report, null, 2) + "\n");
