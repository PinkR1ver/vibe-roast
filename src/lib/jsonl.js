const fs = require("node:fs/promises");
const fssync = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

async function walkFiles(rootDir, predicate) {
  const out = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(filePath);
      } else if (entry.isFile() && predicate(filePath, entry.name)) {
        out.push(filePath);
      }
    }
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

async function readJsonl(filePath, onObject) {
  const stream = fssync.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      await onObject(JSON.parse(trimmed));
    } catch {
      // Session logs can contain partial tail writes. Skip malformed lines.
    }
  }
}

module.exports = { walkFiles, readJsonl };
