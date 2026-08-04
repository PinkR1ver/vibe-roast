const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");

const SCRIPT_URL = pathToFileURL(
  path.join(__dirname, "..", "scripts", "quality", "changed-files.mjs"),
);

test("changed-file gate fails closed when no comparison base exists", async (context) => {
  const repo = temporaryRepository(context);
  const { resolveBase } = await import(SCRIPT_URL);

  assert.throws(
    () => resolveBase(undefined, repo),
    /Unable to resolve a comparison base/,
  );
});

test("changed-file gate rejects an explicit base that was not fetched", async (context) => {
  const repo = temporaryRepository(context);
  commit(repo, "baseline.js", "module.exports = true;\n");
  const { resolveBase } = await import(SCRIPT_URL);

  assert.throws(
    () => resolveBase("1111111111111111111111111111111111111111", repo),
    /does not resolve to a commit/,
  );
});

test("changed-file gate includes working, staged, and untracked files", async (context) => {
  const repo = temporaryRepository(context);
  commit(repo, "tracked.js", "module.exports = true;\n");
  const base = git(repo, "rev-parse", "HEAD").trim();

  fs.writeFileSync(path.join(repo, "tracked.js"), "module.exports = false;\n");
  fs.writeFileSync(path.join(repo, "staged.js"), "module.exports = 1;\n");
  git(repo, "add", "staged.js");
  fs.writeFileSync(path.join(repo, "untracked.js"), "module.exports = 2;\n");

  const { changedFiles } = await import(SCRIPT_URL);
  assert.deepEqual(changedFiles(base, repo), [
    "staged.js",
    "tracked.js",
    "untracked.js",
  ]);
});

test("quality scopes treat CJS as lintable and generated lockfiles as formatter-owned", async () => {
  const { isInScope } = await import(SCRIPT_URL);

  assert.equal(isInScope("dashboard/postcss.config.cjs", "lint"), true);
  assert.equal(isInScope("package-lock.json", "format"), false);
  assert.equal(isInScope("worker/npm-shrinkwrap.json", "format"), false);
});

function temporaryRepository(context) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "vibe-roast-quality-test-"),
  );
  context.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  git(directory, "init", "--quiet");
  git(directory, "config", "user.email", "quality-test@example.invalid");
  git(directory, "config", "user.name", "Quality Test");
  return directory;
}

function commit(repo, file, content) {
  fs.writeFileSync(path.join(repo, file), content);
  git(repo, "add", file);
  git(repo, "commit", "--quiet", "-m", "test baseline");
}

function git(repo, ...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" });
}
