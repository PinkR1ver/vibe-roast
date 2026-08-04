import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (!new Set(["format", "lint"]).has(mode)) {
  console.error(
    "Usage: node scripts/quality/changed-files.mjs <format|lint> [--base=<sha>]",
  );
  process.exit(2);
}

const explicitBase = process.argv
  .slice(3)
  .find((argument) => argument.startsWith("--base="))
  ?.slice("--base=".length);
const base = resolveBase(explicitBase || process.env.QUALITY_BASE_SHA);
const files = changedFiles(base).filter(
  (file) => existsSync(file) && isInScope(file, mode),
);

if (files.length === 0) {
  console.log(`L${mode === "format" ? "0" : "1"}: no matching changed files.`);
  process.exit(0);
}

console.log(
  `L${mode === "format" ? "0" : "1"}: checking ${files.length} changed file(s).`,
);
const executable = `node_modules/.bin/${mode === "format" ? "prettier" : "eslint"}${
  process.platform === "win32" ? ".cmd" : ""
}`;
const args = mode === "format" ? ["--check", ...files] : files;
const result = spawnSync(executable, args, { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

function resolveBase(candidate) {
  if (
    candidate &&
    !/^0+$/.test(candidate) &&
    git(["cat-file", "-e", `${candidate}^{commit}`], true)
  ) {
    return candidate;
  }

  const remoteMain = gitOutput(["merge-base", "HEAD", "origin/main"], true);
  if (remoteMain) return remoteMain;

  return gitOutput(["rev-parse", "HEAD^"], true);
}

function changedFiles(baseSha) {
  const names = new Set();
  const diffs = [];

  if (baseSha)
    diffs.push([
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
      `${baseSha}...HEAD`,
    ]);
  diffs.push(
    ["diff", "--name-only", "--diff-filter=ACMR", "-z"],
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    ["ls-files", "--others", "--exclude-standard", "-z"],
  );

  for (const args of diffs) {
    for (const name of gitOutput(args, false, false).split("\0")) {
      if (name) names.add(name);
    }
  }

  return [...names].sort();
}

function isInScope(file, checkMode) {
  if (/^(?:\.agents|assests|dashboard\/dist|media)\//.test(file)) return false;

  if (checkMode === "format") {
    return /\.(?:cjs|css|js|json|jsonc|jsx|mjs|ya?ml)$/.test(file);
  }

  return /\.(?:cjs|js|jsx|mjs)$/.test(file);
}

function git(args, quiet = false) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: quiet ? "ignore" : "pipe",
  });
  return result.status === 0;
}

function gitOutput(args, allowFailure = false, trim = true) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    if (allowFailure) return "";
    process.stderr.write(result.stderr || "git command failed\n");
    process.exit(result.status ?? 1);
  }
  return trim ? result.stdout.trim() : result.stdout;
}
