const os = require("node:os");
const path = require("node:path");

const { walkFiles } = require("../lib/jsonl");
const { isInRange } = require("../lib/dates");
const {
  emptyTotals,
  emptyReport,
  addTotals,
  usageFromObject,
  cleanText,
  toIsoTimestamp,
  readJsonFile,
} = require("./common");

/**
 * Amazon Q Developer IDE chat history.
 * Default: ~/.aws/amazonq/history/chat-history-*.json (LokiJS dump).
 */
async function inspectAmazonQ({ root, range, home = os.homedir() } = {}) {
  const historyRoot = root || path.join(home, ".aws", "amazonq", "history");
  const files = await walkFiles(
    historyRoot,
    (_filePath, name) =>
      name.startsWith("chat-history") && name.endsWith(".json"),
  );
  const prompts = [];
  const tokenTotals = emptyTotals();
  const notes = [];

  for (const file of files) {
    const data = await readJsonFile(file);
    if (!data) continue;
    for (const entry of extractAmazonQEntries(data)) {
      if (!isInRange(entry.timestamp, range)) continue;
      prompts.push({
        source: "amazonq",
        timestamp: entry.timestamp,
        session_file: file,
        text: entry.text,
      });
      addTotals(tokenTotals, entry.tokens);
    }
  }

  if (!files.length) {
    notes.push("No Amazon Q chat-history-*.json under ~/.aws/amazonq/history.");
  }

  return {
    ...(emptyReport("amazonq", historyRoot, notes)),
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractAmazonQEntries(data) {
  const out = [];
  const tabs = collectAmazonQTabs(data);

  for (const tab of tabs) {
    const tabTs =
      toIsoTimestamp(tab.updatedAt || tab.meta?.updated || tab.meta?.created) || null;
    const conversations = Array.isArray(tab.conversations) ? tab.conversations : [];
    for (const conversation of conversations) {
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      for (const msg of messages) {
        const text = extractAmazonQUserText(msg);
        if (!text) continue;
        out.push({
          text,
          timestamp:
            toIsoTimestamp(msg.timestamp || msg.createdAt || msg.time) || tabTs,
          tokens: usageFromObject(msg),
        });
      }
    }
  }

  return out;
}

function collectAmazonQTabs(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.collections)) {
    const tabs = [];
    for (const collection of data.collections) {
      if (!collection || collection.name !== "tabs") continue;
      if (Array.isArray(collection.data)) tabs.push(...collection.data);
    }
    return tabs;
  }
  if (Array.isArray(data.tabs)) return data.tabs;
  if (Array.isArray(data.conversations)) {
    return [{ conversations: data.conversations, updatedAt: data.updatedAt }];
  }
  return [];
}

function extractAmazonQUserText(msg) {
  if (!msg || typeof msg !== "object") return "";
  const type = String(msg.type || msg.role || msg.kind || "").toLowerCase();
  if (type && !/(prompt|user|human|request)/.test(type)) return "";
  return cleanText(msg.body ?? msg.content ?? msg.text ?? msg.prompt ?? "");
}

module.exports = {
  inspectAmazonQ,
  extractAmazonQEntries,
  extractAmazonQUserText,
};
