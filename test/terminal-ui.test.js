const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const {
  HUMOUR_LINES,
  createTerminalLaunch,
  pickHumour,
  supportsRichOutput,
} = require("../src/lib/terminal-ui");

function outputStream(isTTY) {
  const stream = new PassThrough();
  stream.isTTY = isTTY;
  let output = "";
  stream.on("data", (chunk) => { output += chunk.toString(); });
  return { stream, read: () => output };
}

test("terminal launch falls back to stable plain output outside a TTY", async () => {
  const { stream, read } = outputStream(false);
  const launch = createTerminalLaunch({ stream, env: {}, random: () => 0, frameDelay: 0 });

  launch.intro();
  await launch.ready("http://localhost:7681");

  assert.equal(launch.rich, false);
  assert.equal(read(), "vibe-roast result         → http://localhost:7681\n");
  assert.doesNotMatch(read(), /\u001b\[/);
});

test("rich terminal launch renders brand, humour, progress, and privacy note", async () => {
  const { stream, read } = outputStream(true);
  const launch = createTerminalLaunch({ stream, env: {}, random: () => 0, frameDelay: 0 });

  launch.intro();
  await launch.tokenTrackerSync();
  await launch.ready("http://localhost:7681");

  assert.equal(launch.rich, true);
  assert.match(read(), /VIBE ROAST/);
  assert.match(read(), new RegExp(HUMOUR_LINES[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(read(), /ROAST LAB OPEN/);
  assert.match(read(), /Teaching TokenTracker/);
  assert.match(read(), /Your prompts stay on this machine/);
});

test("NO_COLOR and explicit plain mode disable terminal decoration", () => {
  const { stream } = outputStream(true);
  assert.equal(supportsRichOutput(stream, { NO_COLOR: "1" }), false);
  assert.equal(supportsRichOutput(stream, { VIBE_ROAST_PLAIN_OUTPUT: "1" }), false);
  assert.equal(supportsRichOutput(stream, {}), true);
});

test("humour selection clamps deterministic random input", () => {
  assert.equal(pickHumour(() => 0), HUMOUR_LINES[0]);
  assert.equal(pickHumour(() => 1), HUMOUR_LINES.at(-1));
  assert.equal(pickHumour(() => Number.NaN), HUMOUR_LINES[0]);
});
