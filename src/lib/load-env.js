const fs = require("node:fs");
const path = require("node:path");

function parseEnvValue(raw) {
  const value = String(raw || "").trim();
  if (value.length >= 2 && value[0] === "\"" && value[value.length - 1] === "\"") {
    return value.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, "\"")
      .replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value[0] === "'" && value[value.length - 1] === "'") {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function loadEnvFallback(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = parseEnvValue(match[2]);
  }
}

function resolveLocalEnv(cwd = process.cwd()) {
  for (const name of [".env.local", ".env"]) {
    const candidate = path.resolve(cwd, name);
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return null;
}

function loadLocalEnv(filePath) {
  const resolved = filePath || resolveLocalEnv();
  if (!resolved) return false;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(resolved);
  } else {
    loadEnvFallback(resolved);
  }
  return true;
}

module.exports = {
  loadLocalEnv,
  loadEnvFallback,
  parseEnvValue,
  resolveLocalEnv,
};
