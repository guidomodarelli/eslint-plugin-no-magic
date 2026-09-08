/** @file Measures sampled peak and post-GC memory across many files in isolated processes. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import console from "node:console";
import { cpus, platform } from "node:os";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { ESLint } from "eslint";
import plugin from "../index.js";

/** Each file stresses multiple scope indexes, repeated definitions, and unique values. */
const SCOPES_PER_FILE = 8;
const VALUES_PER_SCOPE = 25;
const WARMUP_FILES = 5;
const FILE_BATCHES = [25, 25, 50];
const MODES = ["parser-only", "reuse", "both"];

/**
 * Generates distinct file values so caches cannot benefit from repeated inputs.
 * @param {number} fileIndex - Unique file identifier.
 * @returns {string} JavaScript source with independently scoped constants.
 */
function source(fileIndex) {
  return Array.from({ length: SCOPES_PER_FILE }, (_, scopeIndex) => {
    const statements = Array.from({ length: VALUES_PER_SCOPE }, (_, index) =>
      `const VALUE_${index} = "value_${fileIndex}_${scopeIndex}_${index}"; const SHARED_${index} = "shared"; state === "value_${fileIndex}_${scopeIndex}_${index}";`);
    return `{ ${statements.join("\n")} }`;
  }).join("\n");
}

/**
 * Samples a full-GC heap after result references have left the lint helper.
 * @returns {object} Process memory counters in bytes.
 */
function collectedMemory() {
  globalThis.gc();
  globalThis.gc();
  return process.memoryUsage();
}

/**
 * Exercises a real engine without retaining lint results between files.
 * @param {object} eslint - Reused ESLint instance.
 * @param {number} fileIndex - Unique input ID.
 * @param {string} mode - Enabled rule combination.
 * @returns {Promise<number>} Sampled heap bytes before collection.
 */
async function lintFile(eslint, fileIndex, mode) {
  const [result] = await eslint.lintText(source(fileIndex), { filePath: `memory-${fileIndex}.js` });
  const reuseCount = mode === "parser-only" ? 0 : SCOPES_PER_FILE * VALUES_PER_SCOPE;
  const duplicateCount = mode === "both" ? SCOPES_PER_FILE * (VALUES_PER_SCOPE - 1) : 0;
  assert.equal(result.fatalErrorCount, 0);
  assert.equal(result.messages.length, reuseCount + duplicateCount);
  return process.memoryUsage().heapUsed;
}

const mode = process.argv[process.argv.indexOf("--mode") + 1];
if (process.argv.includes("--mode")) {
  assert.ok(MODES.includes(mode), "Unknown memory profile");
  assert.equal(typeof globalThis.gc, "function", "Worker requires --expose-gc");
  const rules = mode === "parser-only" ? {} : { "no-magic/prefer-existing-constant": "warn",
    ...(mode === "both" ? { "no-magic/no-duplicate-constants": "warn" } : {}) };
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [{ plugins: { "no-magic": plugin }, rules }] });
  for (let index = 0; index < WARMUP_FILES; index++) await lintFile(eslint, -index - 1, mode);
  const baseline = collectedMemory();
  let sampledPeak = baseline.heapUsed;
  let files = 0;
  const measurements = [];
  for (const batch of FILE_BATCHES) {
    for (let index = 0; index < batch; index++) sampledPeak = Math.max(sampledPeak, await lintFile(eslint, files++, mode));
    const memory = collectedMemory();
    measurements.push({ files, ...memory, retainedHeapDelta: memory.heapUsed - baseline.heapUsed, sampledPeakHeap: sampledPeak });
  }
  process.stdout.write(JSON.stringify({ mode, baseline, measurements }));
} else {
  const results = MODES.map((profile) => JSON.parse(execFileSync(process.execPath,
    ["--expose-gc", fileURLToPath(import.meta.url), "--mode", profile], { encoding: "utf8" })));
  const report = { measuredAt: new Date().toISOString(), node: process.version, eslint: ESLint.version,
    os: platform(), cpu: cpus()[0]?.model, scopesPerFile: SCOPES_PER_FILE, valuesPerScope: VALUES_PER_SCOPE,
    warmupFiles: WARMUP_FILES, batches: FILE_BATCHES, results };
  writeFileSync(new URL("./memory-results.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
