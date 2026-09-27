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
import { DUPLICATE_RULE, MEASURED_RUNS, PLUGIN_NAMESPACE, REUSE_RULE, WARMUP_RUNS } from "./constants/shared.js";
import {
  BASELINE_FLAG,
  BASELINE_REPORT_PATH,
  CANDIDATE_COUNTS,
  COMPARE_FLAG,
  LINTED_FILE_PATH,
  MISS_SCENARIOS,
  MODES,
  NESTED_SCENARIO,
  RESULTS_REPORT_PATH,
  SAME_VALUE_SCENARIO,
  SCENARIOS,
  SCOPE_DEPTH,
  SHADOWED_HIT_SCENARIO,
  SHADOWED_MISS_SCENARIO,
  WIDE_MISS_SCENARIO,
} from "./constants/constants-benchmark.js";

/**
 * Generates preceding const definitions and either matching or absent contract values.
 * @param {number} count - Unique values plus the same number of repeated definitions.
 * @param {string} scenario - Wide matches, misses, or nested lookups.
 * @returns {string} Complete JavaScript source.
 */
function fixture(count, scenario) {
  const declarations = Array.from({ length: count }, (_, index) =>
    `const VALUE_${index} = "value_${index}"; const SHARED_${index} = "shared";`).join("\n");
  const sharedValue = scenario === SAME_VALUE_SCENARIO || scenario === SHADOWED_HIT_SCENARIO;
  const expressions = Array.from({ length: count }, (_, index) =>
    `status === "${sharedValue ? "shared" : `${scenario === WIDE_MISS_SCENARIO ? "missing" : "value"}_${index}`}";`).join("\n");
  if (scenario === SHADOWED_HIT_SCENARIO || scenario === SHADOWED_MISS_SCENARIO) {
    const parameterCount = scenario === SHADOWED_HIT_SCENARIO ? count - 1 : count;
    const parameters = Array.from({ length: parameterCount }, (_, index) =>
      `${scenario === SHADOWED_HIT_SCENARIO ? "SHARED" : "VALUE"}_${index}`).join(",");
    return `${declarations}\nconst lookup = (${parameters}) => { ${expressions} };`;
  }
  return scenario === NESTED_SCENARIO ? `${declarations}\n${"{ let local;".repeat(SCOPE_DEPTH)}\n${expressions}\n${"}".repeat(SCOPE_DEPTH)}`
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
  os: platform(), cpu: cpus()[0]?.model, warmups: WARMUP_RUNS, samples: MEASURED_RUNS, scopeDepth: SCOPE_DEPTH,
  measurements: [],
};
for (const scenario of SCENARIOS) {
  for (const candidates of CANDIDATE_COUNTS) {
    const code = fixture(candidates, scenario);
    for (const mode of MODES) {
      const elapsedSamples = [];
      let diagnosticsHash;
      const parseSamples = [];
      const reuseSamples = [];
      const duplicateSamples = [];
      for (let run = 0; run < WARMUP_RUNS + MEASURED_RUNS; run++) {
        const eslint = new ESLint({ overrideConfigFile: true, stats: true, overrideConfig: [{
          plugins: { [PLUGIN_NAMESPACE]: plugin }, rules: mode.rules,
        }] });
        const started = performance.now();
        const [result] = await eslint.lintText(code, { filePath: LINTED_FILE_PATH });
        const elapsed = performance.now() - started;
        const expectedReuse = mode.rules[REUSE_RULE] && !MISS_SCENARIOS.includes(scenario) ? candidates : 0;
        const expectedDuplicates = mode.rules[DUPLICATE_RULE] ? candidates - 1 : 0;
        assert.equal(result.fatalErrorCount, 0);
        assert.equal(result.messages.filter((message) => message.ruleId === REUSE_RULE).length, expectedReuse);
        assert.equal(result.messages.filter((message) => message.ruleId === DUPLICATE_RULE).length, expectedDuplicates);
        assert.equal(result.messages.length, expectedReuse + expectedDuplicates);
        const currentHash = createHash("sha256").update(JSON.stringify(result.messages)).digest("hex");
        if (diagnosticsHash) assert.equal(currentHash, diagnosticsHash, "Diagnostics must be deterministic across samples");
        diagnosticsHash = currentHash;
        const timing = result.stats.times.passes[0];
        if (run >= WARMUP_RUNS) {
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
if (process.argv.includes(COMPARE_FLAG)) {
  const baseline = JSON.parse(readFileSync(new URL(BASELINE_REPORT_PATH, import.meta.url), "utf8"));
  assert.equal(report.measurements.length, baseline.measurements.length);
  for (const measurement of report.measurements) {
    const previous = baseline.measurements.find((item) => item.scenario === measurement.scenario &&
      item.candidates === measurement.candidates && item.mode === measurement.mode);
    assert.ok(previous, "Every scenario must have a baseline");
    assert.equal(measurement.diagnosticsHash, previous.diagnosticsHash, "Optimization must preserve complete diagnostics");
  }
}
const destination = process.argv.includes(BASELINE_FLAG) ? BASELINE_REPORT_PATH : RESULTS_REPORT_PATH;
writeFileSync(new URL(destination, import.meta.url), JSON.stringify(report, null, 2) + "\n");
