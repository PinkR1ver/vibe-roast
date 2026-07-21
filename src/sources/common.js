const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const { normalizeWhitespace, textFromContent } = require("../extract/text");

function emptyTotals() {
  return {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
  };
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function addTotals(target, delta) {
  if (!delta) return;
  for (const key of Object.keys(target)) {
    target[key] += number(delta[key]);
  }
}

function normalizeTotals(raw = {}) {
  return {
    input_tokens: number(raw.input_tokens),
    cached_input_tokens: number(raw.cached_input_tokens || raw.cache_read_input_tokens),
    cache_creation_input_tokens: number(raw.cache_creation_input_tokens),
    output_tokens: number(raw.output_tokens),
    reasoning_output_tokens: number(raw.reasoning_output_tokens),
    total_tokens:
      number(raw.total_tokens) ||
      number(raw.input_tokens) +
        number(raw.cached_input_tokens || raw.cache_read_input_tokens) +
        number(raw.cache_creation_input_tokens) +
        number(raw.output_tokens) +
        number(raw.reasoning_output_tokens),
  };
}

function emptyReport(source, root, notes = []) {
  return {
    source,
    root,
    files_scanned: 0,
    prompt_count: 0,
    token_totals: emptyTotals(),
    prompts: [],
    notes,
  };
}

function cleanText(value) {
  return normalizeWhitespace(textFromContent(value) || String(value || ""));
}

function toIsoTimestamp(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return toIsoTimestamp(Number(raw));
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function vscodeGlobalStorage(...parts) {
  return resolveVscodeGlobalStorage({ parts });
}

function resolveVscodeGlobalStorage({
  home = os.homedir(),
  platform = process.platform,
  env = process.env,
  parts = [],
  appName = "Code",
} = {}) {
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", appName, "User", "globalStorage", ...parts);
  }
  if (platform === "win32") {
    const appData = env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.win32.join(appData, appName, "User", "globalStorage", ...parts);
  }
  const xdg = env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(xdg, appName, "User", "globalStorage", ...parts);
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function usageFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  const usage =
    obj.usage ||
    obj.token_usage ||
    obj.tokens ||
    obj.message?.usage ||
    obj.metrics?.tokens ||
    null;
  if (!usage) return null;
  return normalizeTotals(usage);
}

module.exports = {
  emptyTotals,
  emptyReport,
  number,
  addTotals,
  normalizeTotals,
  cleanText,
  toIsoTimestamp,
  vscodeGlobalStorage,
  resolveVscodeGlobalStorage,
  readJsonFile,
  usageFromObject,
};
