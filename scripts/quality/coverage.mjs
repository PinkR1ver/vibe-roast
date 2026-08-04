import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const COVERAGE_AREAS = [
  ["src", ".js"],
  ["bin", ".js"],
  ["dashboard/src/lib", ".js"],
  ["worker/src", ".mjs"],
];

export function runCoverage(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const run = options.spawn ?? spawnSync;
  const makeTemp =
    options.makeTemp ??
    (() => mkdtempSync(join(tmpdir(), "vibe-roast-coverage-")));
  const removeTemp =
    options.removeTemp ??
    ((directory) => rmSync(directory, { force: true, recursive: true }));
  const findMissing =
    options.findMissing ??
    ((summaryPath) => missingCoverageFiles(summaryPath, cwd));
  let tempDirectory;

  try {
    tempDirectory = makeTemp();
    const reportsDirectory = join(tempDirectory, "report");
    const executable = resolve(
      cwd,
      "node_modules",
      ".bin",
      `c8${process.platform === "win32" ? ".cmd" : ""}`,
    );
    const args = coverageArguments(cwd, tempDirectory, reportsDirectory);
    const result = run(executable, args, { cwd, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;

    const missingFiles = findMissing(
      join(reportsDirectory, "coverage-summary.json"),
    );
    if (missingFiles.length > 0) {
      console.error("Coverage universe is incomplete. Missing files:");
      for (const file of missingFiles) console.error(`- ${file}`);
      return 1;
    }
    return 0;
  } finally {
    if (tempDirectory) removeTemp(tempDirectory);
  }
}

function coverageArguments(cwd, tempDirectory, reportsDirectory) {
  return [
    "--all",
    ...COVERAGE_AREAS.map(
      ([directory, extension]) => `--include=${directory}/**/*${extension}`,
    ),
    `--temp-directory=${tempDirectory}`,
    `--reports-dir=${reportsDirectory}`,
    "--reporter=text",
    "--reporter=json-summary",
    "--check-coverage",
    "--lines=79.7",
    "--branches=67.6",
    "--functions=89.2",
    process.execPath,
    "--test",
    ...readdirSync(resolve(cwd, "test"))
      .filter((file) => file.endsWith(".test.js"))
      .map((file) => join("test", file)),
  ];
}

function missingCoverageFiles(summaryPath, cwd) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const coveredPaths = new Set(
    Object.keys(summary).map((file) => resolve(file)),
  );
  return coverageFiles(cwd).filter(
    (file) => !coveredPaths.has(resolve(cwd, file)),
  );
}

function coverageFiles(cwd) {
  return COVERAGE_AREAS.flatMap(([directory, extension]) =>
    walk(resolve(cwd, directory), (file) => file.endsWith(extension)).map(
      (file) => file.slice(cwd.length + 1),
    ),
  ).sort();
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  process.exitCode = runCoverage();
}
