const os = require("node:os");
const path = require("node:path");

const { walkFiles, readJsonl } = require("../lib/jsonl");
const { isInRange } = require("../lib/dates");
const { normalizeWhitespace } = require("../extract/text");

async function inspectClaude({ root, range } = {}) {
  const projectsRoot = root || path.join(os.homedir(), ".claude", "projects");
  const files = await walkFiles(projectsRoot, (_filePath, name) => name.endsWith(".jsonl"));
  const prompts = [];
  const tokenTotals = emptyTotals();

  for (const file of files) {
    await readJsonl(file, (obj) => {
      const timestamp = obj.timestamp || null;
      if (!isInRange(timestamp, range)) return;

      const text = extractClaudePrompt(obj);
      if (text) {
        prompts.push({
          source: "claude",
          timestamp,
          session_file: file,
          text,
        });
      }

      const tokens = extractClaudeTokens(obj);
      if (tokens) addTotals(tokenTotals, tokens);
    });
  }

  return {
    source: "claude",
    root: projectsRoot,
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractClaudePrompt(obj) {
  if (obj?.type !== "user" && obj?.message?.role !== "user") return "";
  // Skip synthetic user rows that only wrap tool results / meta.
  if (obj?.isMeta || obj?.isCompactSummary) return "";
  const content = obj?.message?.content ?? obj?.content;
  return normalizeWhitespace(textFromClaudeUserContent(content));
}

function textFromClaudeUserContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      if (block.type && block.type !== "text") return "";
      return typeof block.text === "string" ? block.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractClaudeTokens(obj) {
  const usage = obj?.message?.usage || obj?.usage;
  if (!usage) return null;
  return {
    input_tokens: number(usage.input_tokens),
    cached_input_tokens: number(usage.cache_read_input_tokens || usage.cached_input_tokens),
    cache_creation_input_tokens: number(usage.cache_creation_input_tokens),
    output_tokens: number(usage.output_tokens),
    reasoning_output_tokens: 0,
    total_tokens:
      number(usage.input_tokens) +
      number(usage.cache_read_input_tokens || usage.cached_input_tokens) +
      number(usage.cache_creation_input_tokens) +
      number(usage.output_tokens),
  };
}

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

function addTotals(target, delta) {
  for (const key of Object.keys(target)) target[key] += number(delta[key]);
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

module.exports = { inspectClaude, extractClaudePrompt, extractClaudeTokens };
