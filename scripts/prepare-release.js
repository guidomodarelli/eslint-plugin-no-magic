/** @file Runs release quality gates and creates a verified local artifact without publishing or committing. */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import console from "node:console";
import { validatePackageContents, validateReleaseMetadata } from "./release-checks.js";
import {
  ARCHIVE_EXTENSION,
  CHANGELOG_FILE,
  LINE_BREAK_PATTERN,
  PACKAGE_MANIFEST_FILE,
  PACKED_MANIFEST_PATH,
  RELEASE_PREPARATION_COMMANDS,
  RELEASES_DIRECTORY,
  STAGING_DIRECTORY_PREFIX,
} from "./constants/release.js";

/** Resolves all generated paths within the calling repository. */
const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, PACKAGE_MANIFEST_FILE), "utf8"));
validateReleaseMetadata(metadata, readFileSync(join(root, CHANGELOG_FILE), "utf8"));

for (const command of RELEASE_PREPARATION_COMMANDS) {
  execSync(command, { cwd: root, stdio: "inherit" });
}
const releases = join(root, RELEASES_DIRECTORY);
mkdirSync(releases, { recursive: true });
const staging = mkdtempSync(join(releases, STAGING_DIRECTORY_PREFIX));
try {
  // Only the generated alphanumeric basename enters this command, never user input.
  execSync(`pnpm --ignore-scripts pack --pack-destination ${RELEASES_DIRECTORY}/${basename(staging)}`, { cwd: root, stdio: "inherit" });
  const archive = readdirSync(staging).find((entry) => entry.endsWith(ARCHIVE_EXTENSION));
  if (!archive) throw new Error("release: pnpm pack did not produce an archive");
  const archivePath = join(staging, archive);
  const entries = execFileSync("tar", ["-tf", archivePath], { encoding: "utf8" }).trim().split(LINE_BREAK_PATTERN);
  validatePackageContents(metadata, entries);
  const packed = JSON.parse(execFileSync("tar", ["-xOf", archivePath, PACKED_MANIFEST_PATH], { encoding: "utf8" }));
  if (packed.version !== metadata.version || packed.name !== metadata.name) throw new Error("release: packed name/version differs from the validated manifest");
  const digest = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
  const destination = join(releases, `${metadata.version}-${digest}`);
  if (!existsSync(destination)) renameSync(staging, destination);
  else if (createHash("sha256").update(readFileSync(join(destination, archive))).digest("hex") !== digest) {
    throw new Error("release: existing destination does not match its artifact hash");
  }
  console.log(`Prepared ${join(destination, archive)}\nSHA256 ${digest}\nNo commit, tag, or publication was performed.`);
} finally {
  // This unique directory was created above; no preexisting release is removed.
  if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
}
