const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const cliPath = path.join(__dirname, "..", "bin", "vibe-wrapper.js");
const fixtures = path.join(__dirname, "fixtures");

test("CLI starts the dashboard when no command is provided", async () => {
  const child = spawn(process.execPath, [cliPath], {
    env: {
      ...process.env,
      PORT: "0",
      VIBE_WRAPPER_NO_OPEN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  let stdout = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  try {
    await waitForOutput(() => stderr.includes("vibe-wrapper roast result"));
    assert.match(stderr, /http:\/\/localhost:\d+/);
    assert.doesNotMatch(stderr, /http:\/\/localhost:7681/);
    assert.equal(stdout, "");
  } finally {
    await stopChild(child);
  }
});

test("CLI inspect reports Codex, Claude, and Cursor fixtures", async () => {
  const child = spawn(
    process.execPath,
    [
      cliPath,
      "inspect",
      "--from",
      "2026-06-07",
      "--to",
      "2026-06-07",
      "--sources",
      "codex,claude,cursor",
      "--codex-root",
      path.join(fixtures, "codex", "sessions"),
      "--claude-root",
      path.join(fixtures, "claude", "projects"),
      "--cursor-db",
      path.join(fixtures, "cursor", "state.vscdb"),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const { stdout, stderr, code } = await collectChild(child);
  assert.equal(code, 0, stderr);
  const report = JSON.parse(stdout);
  assert.equal(report.summary.source_count, 3);
  assert.equal(report.summary.prompt_count, 5);
  assert.ok(report.sources.codex);
  assert.ok(report.sources.claude);
  assert.ok(report.sources.cursor);
  assert.ok(report.vibe_profile?.tier?.id);
});

function waitForOutput(predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Timed out waiting for CLI output"));
    }, 3000);

    const interval = setInterval(() => {
      if (!predicate()) return;
      clearTimeout(timeout);
      clearInterval(interval);
      resolve();
    }, 25);
  });
}

function collectChild(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ stdout, stderr, code }));
  });
}

function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  child.kill("SIGTERM");
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}
