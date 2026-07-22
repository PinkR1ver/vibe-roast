const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { isInRange } = require("../lib/dates");
const { emptyTotals, emptyReport, cleanText, toIsoTimestamp } = require("./common");

const DEFAULT_SEARCH_DIRS = ["projects", "dev", "src", "work", "code", "Desktop", "Documents"];

async function inspectAider({ root, range, home = os.homedir() } = {}) {
  const historyFiles = await findAiderHistoryFiles(root, home);
  const prompts = [];
  let filesScanned = 0;

  for (const file of historyFiles) {
    filesScanned += 1;
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const entry of parseAiderHistory(text)) {
      if (!isInRange(entry.timestamp, range)) continue;
      prompts.push({
        source: "aider",
        timestamp: entry.timestamp,
        session_file: file,
        text: entry.text,
      });
    }
  }

  const usedRoot = root || (historyFiles[0] ? path.dirname(historyFiles[0]) : path.join(home, "projects"));
  return {
    ...(emptyReport(
      "aider",
      usedRoot,
      historyFiles.length
        ? []
        : ["No .aider.chat.history.md files found under the search roots."],
    )),
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    token_totals: emptyTotals(),
    prompts,
  };
}

async function findAiderHistoryFiles(root, home) {
  if (root) {
    try {
      const st = await fs.stat(root);
      if (st.isFile()) return path.basename(root).includes("aider") ? [root] : [root];
    } catch {
      return [];
    }
    return walkDepth(root, 4, (name) => name === ".aider.chat.history.md");
  }

  const out = [];
  const cwdFile = path.join(process.cwd(), ".aider.chat.history.md");
  try {
    await fs.access(cwdFile);
    out.push(cwdFile);
  } catch {
    // ignore
  }

  for (const dirName of DEFAULT_SEARCH_DIRS) {
    const base = path.join(home, dirName);
    const found = await walkDepth(base, 3, (name) => name === ".aider.chat.history.md");
    out.push(...found);
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}

async function walkDepth(rootDir, maxDepth, predicate) {
  const out = [];
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < maxDepth) stack.push({ dir: filePath, depth: depth + 1 });
      } else if (entry.isFile() && predicate(entry.name, filePath)) {
        out.push(filePath);
      }
    }
  }
  return out;
}

function parseAiderHistory(markdown) {
  const entries = [];
  const lines = String(markdown || "").split(/\r?\n/);
  let current = null;

  const flush = () => {
    if (!current) return;
    const text = cleanText(current.lines.join("\n"));
    if (text) {
      entries.push({
        timestamp: current.timestamp,
        text,
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (/^#+\s*(?:aider:)?\s*(user|human)\b/i.test(line)) {
      flush();
      const stampMatch = line.match(/\((\d{4}-\d{2}-\d{2}[^)]*)\)/);
      current = {
        timestamp: toIsoTimestamp(stampMatch?.[1]) || null,
        lines: [],
      };
      continue;
    }

    if (/^>\?\s+/.test(line)) {
      flush();
      current = {
        timestamp: null,
        lines: [line.replace(/^>\?\s+/, "")],
      };
      continue;
    }

    if (/^#+\s*(?:aider:)?\s*(assistant|model|ai|coder)\b/i.test(line)) {
      flush();
      continue;
    }

    if (current) current.lines.push(line);
  }
  flush();
  return entries;
}

module.exports = { inspectAider, parseAiderHistory, extractAiderUserText: (md) => parseAiderHistory(md).map((e) => e.text) };
