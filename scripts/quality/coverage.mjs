import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const tempDirectory = mkdtempSync(join(tmpdir(), "vibe-roast-coverage-"));
const reportsDirectory = join(tempDirectory, "report");
const executable = resolve(
  "node_modules",
  ".bin",
  `c8${process.platform === "win32" ? ".cmd" : ""}`,
);
const args = [
  "--all",
  "--include=src/**/*.js",
  "--include=bin/*.js",
  "--include=dashboard/src/lib/*.js",
  "--include=worker/src/*.mjs",
  `--temp-directory=${tempDirectory}`,
  `--reports-dir=${reportsDirectory}`,
  "--reporter=text",
  "--reporter=json-summary",
  "--check-coverage",
  "--lines=79.7",
  "--branches=67.7",
  "--functions=89.2",
  process.execPath,
  "--test",
  ...readdirSync("test")
    .filter((file) => file.endsWith(".test.js"))
    .map((file) => join("test", file)),
];

try {
  const result = spawnSync(executable, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  const missingFiles = missingCoverageFiles(
    join(reportsDirectory, "coverage-summary.json"),
  );
  if (missingFiles.length > 0) {
    console.error("Coverage universe is incomplete. Missing files:");
    for (const file of missingFiles) console.error(`- ${file}`);
  }
  process.exitCode = result.status === 0 && missingFiles.length === 0 ? 0 : 1;
} finally {
  rmSync(tempDirectory, { force: true, recursive: true });
}

function missingCoverageFiles(summaryPath) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const coveredPaths = new Set(
    Object.keys(summary).map((file) => resolve(file)),
  );
  return coverageFiles().filter((file) => !coveredPaths.has(resolve(file)));
}

function coverageFiles() {
  return [
    ...walk("bin", (file) => file.endsWith(".js")),
    ...walk("src", (file) => file.endsWith(".js")),
    ...walk("dashboard/src/lib", (file) => file.endsWith(".js")),
    ...walk("worker/src", (file) => file.endsWith(".mjs")),
  ].sort();
}

function walk(directory, include) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, include));
    else if (include(path)) files.push(path);
  }
  return files;
}
