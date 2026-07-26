const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  ensureTokenTracker,
  trackerPaths,
} = require("../src/lib/token-tracker-runtime");

test("ensureTokenTracker initializes a new local tracker and detects its queue", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-token-init-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const calls = [];
  const paths = trackerPaths(home);

  const result = await ensureTokenTracker({
    home,
    env: {},
    runner: async (args) => {
      calls.push(args);
      await fs.mkdir(paths.trackerDir, { recursive: true });
      await fs.writeFile(paths.queuePath, `${JSON.stringify({ total_tokens: 42 })}\n`);
    },
  });

  assert.deepEqual(calls, [["init", "--yes", "--no-open"]]);
  assert.equal(result.status, "ready");
  assert.equal(result.command, "init");
});

test("ensureTokenTracker syncs an initialized tracker", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-token-sync-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const paths = trackerPaths(home);
  await fs.mkdir(paths.trackerDir, { recursive: true });
  await fs.writeFile(paths.initializedPath, "{}\n");
  await fs.writeFile(paths.queuePath, "{}\n");
  const calls = [];

  const result = await ensureTokenTracker({
    home,
    env: {},
    runner: async (args) => calls.push(args),
  });

  assert.deepEqual(calls, [["sync"]]);
  assert.equal(result.status, "ready");
  assert.equal(result.command, "sync");
});

test("ensureTokenTracker reports dependency failures without crashing Vibe Roaster", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-token-error-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));

  const result = await ensureTokenTracker({
    home,
    env: {},
    runner: async () => {
      throw new Error("permission denied");
    },
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /permission denied/);
});
