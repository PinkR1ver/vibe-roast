const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEFAULT_TIMEOUT_MS = 90_000;

function trackerPaths(home = os.homedir()) {
  const trackerDir = path.join(home, ".tokentracker", "tracker");
  return {
    trackerDir,
    queuePath: path.join(trackerDir, "queue.jsonl"),
    initializedPath: path.join(trackerDir, "cursors.json"),
  };
}

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function trackerCliPath() {
  return require.resolve("tokentracker-cli/bin/tracker.js");
}

function runTracker(args, {
  env = process.env,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [trackerCliPath(), ...args], {
      env: {
        ...env,
        // Vibe Roaster starts TokenTracker only for local aggregation. Do not
        // make that implicit integration opt users into anonymous telemetry.
        TOKENTRACKER_NO_TELEMETRY: env.TOKENTRACKER_NO_TELEMETRY || "1",
      },
      stdio: "ignore",
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`TokenTracker ${args[0]} timed out`));
    }, timeoutMs);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`TokenTracker ${args[0]} exited with ${signal || code}`));
    });
  });
}

async function ensureTokenTracker({
  home = os.homedir(),
  env = process.env,
  runner = runTracker,
} = {}) {
  const paths = trackerPaths(home);
  if (env.VIBE_ROAST_SKIP_TOKEN_TRACKER === "1") {
    return { status: "skipped", ...paths };
  }

  const initialized = await isFile(paths.initializedPath);
  const command = initialized
    ? ["sync"]
    : ["init", "--yes", "--no-open"];

  try {
    await runner(command, { env });
    const available = await isFile(paths.queuePath);
    return {
      status: available ? "ready" : "empty",
      command: command[0],
      ...paths,
    };
  } catch (error) {
    return {
      status: "error",
      command: command[0],
      error: error?.message || String(error),
      ...paths,
    };
  }
}

module.exports = {
  ensureTokenTracker,
  runTracker,
  trackerCliPath,
  trackerPaths,
};
