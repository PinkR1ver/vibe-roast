#!/usr/bin/env node
const { inspectSources } = require("../src/inspect");
const { start } = require("../src/server");
const { install, uninstall } = require("../src/hooks/install");
const { KNOWN_SOURCES } = require("../src/sources");

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "serve") {
    await start();
    return;
  }

  if (command === "install") {
    const results = await install();
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    return;
  }

  if (command === "uninstall") {
    const results = await uninstall();
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    return;
  }

  if (command !== "inspect") {
    process.stderr.write(
      "Usage: vibe-wrapper [serve]|inspect|install|uninstall\n" +
        `Known sources: ${KNOWN_SOURCES.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const opts = parseArgs(rest);
  const report = await inspectSources({
    from: opts.from,
    to: opts.to,
    sources: opts.sources,
    roots: {
      home: opts.home,
      codex: opts.codexRoot,
      claude: opts.claudeRoot,
      cursor: opts.cursorDb,
      cursorDb: opts.cursorDb,
      cline: opts.clineRoot,
      roo: opts.rooRoot,
      continue: opts.continueRoot,
      gemini: opts.geminiRoot,
      aider: opts.aiderRoot,
      windsurf: opts.windsurfRoot,
      copilot: opts.copilotRoot,
      tokenTrackerQueue: opts.tokenTrackerQueue,
    },
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    if (key === "from") opts.from = value;
    else if (key === "to") opts.to = value;
    else if (key === "sources") opts.sources = value;
    else if (key === "home") opts.home = value;
    else if (key === "codex-root") opts.codexRoot = value;
    else if (key === "claude-root") opts.claudeRoot = value;
    else if (key === "cursor-db") opts.cursorDb = value;
    else if (key === "cline-root") opts.clineRoot = value;
    else if (key === "roo-root") opts.rooRoot = value;
    else if (key === "continue-root") opts.continueRoot = value;
    else if (key === "gemini-root") opts.geminiRoot = value;
    else if (key === "aider-root") opts.aiderRoot = value;
    else if (key === "windsurf-root") opts.windsurfRoot = value;
    else if (key === "copilot-root") opts.copilotRoot = value;
    else if (key === "token-tracker-queue") opts.tokenTrackerQueue = value;
  }
  return opts;
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});
