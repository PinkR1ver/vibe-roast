const { inspectVscodeTaskStore, extractTaskUserText } = require("./vscode-tasks");

async function inspectRoo(options = {}) {
  return inspectVscodeTaskStore({
    source: "roo",
    extensionId: "rooveterinaryinc.roo-cline",
    ...options,
  });
}

module.exports = { inspectRoo, extractTaskUserText };
