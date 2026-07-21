const os = require("node:os");
const path = require("node:path");

const { walkFiles, readJsonl } = require("../lib/jsonl");
const { isInRange } = require("../lib/dates");
const { normalizeWhitespace, textFromContent } = require("../extract/text");

async function inspectCodex({ root, range } = {}) {
  const sessionsRoot = root || path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "sessions");
  const files = await walkFiles(
    sessionsRoot,
    (_filePath, name) => name.endsWith(".jsonl") && (name.startsWith("rollout-") || true),
  );
  const prompts = [];
  const tokenTotals = emptyTotals();

  for (const file of files) {
    await readJsonl(file, (obj) => {
      const timestamp = obj.timestamp || obj.payload?.timestamp || null;
      if (!isInRange(timestamp, range)) return;

      const text = extractCodexPrompt(obj);
      if (text) {
        prompts.push({
          source: "codex",
          timestamp,
          session_file: file,
          text,
        });
      }

      const tokens = extractCodexTokens(obj);
      if (tokens) addTotals(tokenTotals, tokens);
    });
  }

  return {
    source: "codex",
    root: sessionsRoot,
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractCodexPrompt(obj) {
  const payload = obj?.payload || {};
  const nested = payload.msg && typeof payload.msg === "object" ? payload.msg : null;
  const type = String(payload.type || nested?.type || "").toLowerCase();
  // Codex rollouts mix user / agent / tool / token events — only keep user prompts.
  if (type !== "user_message") return "";

  const candidates = [
    payload.message,
    payload.text,
    payload.input,
    payload.content,
    nested?.message,
    nested?.text,
    nested?.input,
    nested?.content,
  ];
  for (const candidate of candidates) {
    const text = normalizeWhitespace(textFromContent(candidate));
    if (text) return text;
  }
  return "";
}

function extractCodexTokens(obj) {
  const payload = obj?.payload || {};
  const info =
    payload.type === "token_count" ? payload.info
    : payload.msg?.type === "token_count" ? payload.msg.info
    : null;
  if (!info) return null;
  return normalizeTotals(info.total_token_usage || info);
}

function normalizeTotals(raw) {
  return {
    input_tokens: number(raw.input_tokens),
    cached_input_tokens: number(raw.cached_input_tokens),
    cache_creation_input_tokens: number(raw.cache_creation_input_tokens),
    output_tokens: number(raw.output_tokens),
    reasoning_output_tokens: number(raw.reasoning_output_tokens),
    total_tokens: number(raw.total_tokens),
  };
}

function emptyTotals() {
  return normalizeTotals({});
}

function addTotals(target, delta) {
  for (const key of Object.keys(target)) target[key] += number(delta[key]);
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

module.exports = { inspectCodex, extractCodexPrompt, extractCodexTokens };
