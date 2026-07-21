const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

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
 * Google Antigravity IDE — best-effort.
 * Conversations live as encrypted/binary `.pb` under ~/.gemini/antigravity(-ide)/conversations.
 * We only ingest plaintext JSON/JSONL exports if present; otherwise return empty with notes.
 */
async function inspectAntigravity({ root, range, home = os.homedir(), platform, env } = {}) {
  const roots = root
    ? [root]
    : defaultAntigravityRoots({ home, platform, env });

  const prompts = [];
  const tokenTotals = emptyTotals();
  let filesScanned = 0;
  let pbSeen = 0;
  let usedRoot = roots[0] || null;
  const notes = [];

  for (const storeRoot of roots) {
    const files = await walkFiles(storeRoot, () => true);
    if (!files.length) continue;
    usedRoot = storeRoot;

    for (const file of files) {
      const name = path.basename(file).toLowerCase();
      if (name.endsWith(".pb")) {
        pbSeen += 1;
        continue;
      }
      if (!name.endsWith(".json") && !name.endsWith(".jsonl")) continue;

      const data = await readJsonFile(file);
      if (!data) continue;
      filesScanned += 1;
      for (const entry of extractAntigravityEntries(data)) {
        if (!isInRange(entry.timestamp, range)) continue;
        prompts.push({
          source: "antigravity",
          timestamp: entry.timestamp,
          session_file: file,
          text: entry.text,
        });
        addTotals(tokenTotals, entry.tokens);
      }
    }
    if (filesScanned > 0 || pbSeen > 0) break;
  }

  if (pbSeen > 0 && prompts.length === 0) {
    notes.push(
      `Found ${pbSeen} Antigravity conversation .pb file(s); content is protobuf/binary and not parsed.`,
    );
  } else if (!filesScanned && !pbSeen) {
    notes.push(
      "No Antigravity conversation dir found (~/.gemini/antigravity(-ide)/conversations or App Support state).",
    );
  }

  return {
    ...(emptyReport("antigravity", usedRoot, notes)),
    files_scanned: filesScanned + pbSeen,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function defaultAntigravityRoots({ home, platform = process.platform, env = process.env }) {
  const support =
    platform === "darwin"
      ? path.join(home, "Library", "Application Support")
      : platform === "win32"
        ? path.join(env.APPDATA || path.join(home, "AppData", "Roaming"))
        : path.join(home, ".config");

  return [
    path.join(home, ".gemini", "antigravity-ide", "conversations"),
    path.join(home, ".gemini", "antigravity", "conversations"),
    path.join(support, "Antigravity IDE", "User", "globalStorage"),
    path.join(support, "Antigravity", "User", "globalStorage"),
    path.join(support, "antigravity", "User", "globalStorage"),
  ];
}

function extractAntigravityEntries(data) {
  const out = [];
  const messages = Array.isArray(data)
    ? data
    : Array.isArray(data.messages)
      ? data.messages
      : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.conversations)
          ? data.conversations.flatMap((c) => (Array.isArray(c.messages) ? c.messages : []))
          : [];

  for (const row of messages) {
    const text = extractAntigravityUserText(row);
    if (!text) continue;
    out.push({
      text,
      timestamp: toIsoTimestamp(row.timestamp || row.createdAt || row.time || data.updatedAt),
      tokens: usageFromObject(row),
    });
  }
  return out;
}

function extractAntigravityUserText(row) {
  if (!row || typeof row !== "object") return "";
  const role = String(row.role || row.type || row.author || "").toLowerCase();
  if (role && !/(user|human|prompt|request)/.test(role)) return "";
  return cleanText(row.content ?? row.text ?? row.body ?? row.prompt ?? "");
}

/** Exists helper for tests / docs. */
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  inspectAntigravity,
  extractAntigravityEntries,
  extractAntigravityUserText,
  defaultAntigravityRoots,
  pathExists,
};
