const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const cliPath = path.join(__dirname, "..", "bin", "vibe-wrapper.js");

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
    await waitForOutput(() => stderr.includes("vibe-wrapper dashboard"));
    assert.match(stderr, /http:\/\/localhost:\d+/);
    assert.doesNotMatch(stderr, /http:\/\/localhost:7681/);
    assert.equal(stdout, "");
  } finally {
    await stopChild(child);
  }
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

function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  child.kill("SIGTERM");
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}
