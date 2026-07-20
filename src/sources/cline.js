const { inspectVscodeTaskStore, extractTaskUserText } = require("./vscode-tasks");

async function inspectCline(options = {}) {
  return inspectVscodeTaskStore({
    source: "cline",
    extensionId: "saoudrizwan.claude-dev",
    ...options,
  });
}

module.exports = { inspectCline, extractTaskUserText };
