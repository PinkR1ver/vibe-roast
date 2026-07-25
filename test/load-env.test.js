const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  loadEnvFallback,
  parseEnvValue,
  resolveLocalEnv,
} = require("../src/lib/load-env");

test("env parser supports quotes and inline comments", () => {
  assert.equal(parseEnvValue("\"hello\\nworld\""), "hello\nworld");
  assert.equal(parseEnvValue("'literal value'"), "literal value");
  assert.equal(parseEnvValue("plain # comment"), "plain");
});

test("fallback env loader does not overwrite explicit process variables", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-wrapper-env-"));
  const file = path.join(root, ".env");
  const original = process.env.VIBE_WRAPPER_ENV_TEST;
  try {
    fs.writeFileSync(file, "VIBE_WRAPPER_ENV_TEST=from-file\nVIBE_WRAPPER_ENV_NEW=loaded\n");
    process.env.VIBE_WRAPPER_ENV_TEST = "from-shell";
    delete process.env.VIBE_WRAPPER_ENV_NEW;
    loadEnvFallback(file);
    assert.equal(process.env.VIBE_WRAPPER_ENV_TEST, "from-shell");
    assert.equal(process.env.VIBE_WRAPPER_ENV_NEW, "loaded");
  } finally {
    if (original === undefined) delete process.env.VIBE_WRAPPER_ENV_TEST;
    else process.env.VIBE_WRAPPER_ENV_TEST = original;
    delete process.env.VIBE_WRAPPER_ENV_NEW;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("local env resolution prefers .env.local and ignores a .env directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-wrapper-env-"));
  try {
    fs.mkdirSync(path.join(root, ".env"));
    fs.writeFileSync(path.join(root, ".env.local"), "VALUE=local\n");
    assert.equal(resolveLocalEnv(root), path.join(root, ".env.local"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
