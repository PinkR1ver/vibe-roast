#!/usr/bin/env node
const { inspectSources } = require("../src/inspect");
const { start } = require("../src/server");

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === "serve") {
    await start();
    return;
  }
  if (command !== "inspect") {
    process.stderr.write("Usage: vibe-wrapper inspect|serve\n");
    process.exitCode = 1;
    return;
  }

  const opts = parseArgs(rest);
  const report = await inspectSources({
    from: opts.from,
    to: opts.to,
    sources: opts.sources,
    roots: {
      codex: opts.codexRoot,
      claude: opts.claudeRoot,
      cursor: opts.cursorDb,
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
    else if (key === "codex-root") opts.codexRoot = value;
    else if (key === "claude-root") opts.claudeRoot = value;
    else if (key === "cursor-db") opts.cursorDb = value;
  }
  return opts;
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});
