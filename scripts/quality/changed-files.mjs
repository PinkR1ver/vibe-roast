import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export function run(argv = process.argv.slice(2), cwd = process.cwd()) {
  try {
    const mode = argv[0];
    if (!new Set(["format", "lint"]).has(mode)) {
      throw new Error(
        "Usage: node scripts/quality/changed-files.mjs <format|lint> [--base=<sha>]",
      );
    }

    const explicitBase = argv
      .slice(1)
      .find((argument) => argument.startsWith("--base="))
      ?.slice("--base=".length);
    const base = resolveBase(explicitBase || process.env.QUALITY_BASE_SHA, cwd);
    const files = changedFiles(base, cwd).filter(
      (file) => existsSync(resolve(cwd, file)) && isInScope(file, mode),
    );

    if (files.length === 0) {
      console.log(
        `L${mode === "format" ? "0" : "1"}: no matching changed files.`,
      );
      return 0;
    }

    console.log(
      `L${mode === "format" ? "0" : "1"}: checking ${files.length} changed file(s).`,
    );
    const executable = resolve(
      cwd,
      "node_modules",
      ".bin",
      `${mode === "format" ? "prettier" : "eslint"}${process.platform === "win32" ? ".cmd" : ""}`,
    );
    const args = mode === "format" ? ["--check", ...files] : files;
    const result = spawnSync(executable, args, { cwd, stdio: "inherit" });

    if (result.error) throw result.error;
    return result.status ?? 1;
  } catch (error) {
    console.error(`Quality gate failed closed: ${error.message}`);
    return 1;
  }
}

export function resolveBase(candidate, cwd = process.cwd()) {
  if (candidate && !/^0+$/.test(candidate)) {
    if (git(["cat-file", "-e", `${candidate}^{commit}`], cwd, true))
      return candidate;
    throw new Error(
      `QUALITY_BASE_SHA does not resolve to a commit: ${candidate}`,
    );
  }

  const remoteMain = gitOutput(
    ["merge-base", "HEAD", "origin/main"],
    cwd,
    true,
  );
  if (remoteMain) return remoteMain;

  const parent = gitOutput(["rev-parse", "HEAD^"], cwd, true);
  if (parent) return parent;

  throw new Error(
    "Unable to resolve a comparison base. Fetch the base branch or set QUALITY_BASE_SHA.",
  );
}

export function changedFiles(baseSha, cwd = process.cwd()) {
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
    for (const name of gitOutput(args, cwd, false, false).split("\0")) {
      if (name) names.add(name);
    }
  }

  return [...names].sort();
}

export function isInScope(file, checkMode) {
  if (/^(?:\.agents|assests|dashboard\/dist|media)\//.test(file)) return false;

  if (checkMode === "format") {
    if (/(?:^|\/)(?:package-lock|npm-shrinkwrap)\.json$/.test(file))
      return false;
    return /\.(?:cjs|css|js|json|jsonc|jsx|mjs|ya?ml)$/.test(file);
  }

  return /\.(?:cjs|js|jsx|mjs)$/.test(file);
}

function git(args, cwd, quiet = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: quiet ? "ignore" : "pipe",
  });
  return result.status === 0;
}

function gitOutput(args, cwd, allowFailure = false, trim = true) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    if (allowFailure) return "";
    throw new Error((result.stderr || "git command failed").trim());
  }
  return trim ? result.stdout.trim() : result.stdout;
}

if (isMain) process.exitCode = run();
