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
  const contextByDay = new Map();

  for (const file of files) {
    let previousTotals = null;
    let pendingTools = [];
    await readJsonl(file, (obj) => {
      const timestamp = obj.timestamp || obj.payload?.timestamp || null;
      const inRequestedRange = isInRange(timestamp, range);

      if (inRequestedRange) {
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

        const tool = extractCodexTool(obj);
        if (tool) pendingTools.push(tool);
      }

      const usage = extractCodexUsageEvent(obj);
      if (usage) {
        const delta = codexUsageDelta(usage, previousTotals);
        if (usage.total) previousTotals = usage.total;
        if (inRequestedRange) addCodexContext(contextByDay, timestamp, delta, pendingTools);
        pendingTools = [];
      }
    });
  }

  return {
    source: "codex",
    root: sessionsRoot,
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    context_breakdown_daily: [...contextByDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
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
    const text = normalizeWhitespace(stripCodexInjectedContext(textFromContent(candidate)));
    if (text) return text;
  }
  return "";
}

function stripCodexInjectedContext(value) {
  let text = String(value || "");

  // Desktop attachment/browser envelopes place the authored request after
  // this marker. Prefer that explicit boundary so filenames, screenshots, and
  // ambient browser state never become personality evidence.
  const requestMarker = /^## My request for Codex:\s*$/gim;
  const markers = [...text.matchAll(requestMarker)];
  if (markers.length > 0) {
    const marker = markers[markers.length - 1];
    return text.slice((marker.index || 0) + marker[0].length).trim();
  }

  // Some client versions inject the same context blocks without the request
  // marker. Strip only known machine-owned envelopes; preserve ordinary XML,
  // Markdown, and user-authored instructions.
  const injectedTags = [
    "in-app-browser-context",
    "recommended_plugins",
    "environment_context",
  ];
  for (const tag of injectedTags) {
    const block = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    text = text.replace(block, " ");
  }
  return text.trim();
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

function extractCodexUsageEvent(obj) {
  const payload = obj?.payload || {};
  const info =
    payload.type === "token_count" ? payload.info
    : payload.msg?.type === "token_count" ? payload.msg.info
    : null;
  if (!info) return null;
  return {
    last: info.last_token_usage && typeof info.last_token_usage === "object"
      ? info.last_token_usage
      : null,
    total: info.total_token_usage && typeof info.total_token_usage === "object"
      ? info.total_token_usage
      : null,
  };
}

function extractCodexTool(obj) {
  if (obj?.type !== "response_item" || obj?.payload?.type !== "function_call") return "";
  const payload = obj.payload;
  if (typeof payload.namespace === "string" && payload.namespace.startsWith("mcp__")) {
    return `${payload.namespace}${payload.name || ""}`;
  }
  return typeof payload.name === "string" ? payload.name : "";
}

function codexUsageDelta(usage, previousTotals) {
  if (!usage) return null;
  if (usage.total && previousTotals) {
    const total = normalizeCodexUsage(usage.total);
    const previous = normalizeCodexUsage(previousTotals);
    if (total.total_tokens >= previous.total_tokens) {
      return Object.fromEntries(
        Object.keys(total).map((key) => [key, Math.max(0, total[key] - previous[key])]),
      );
    }
  }
  return normalizeCodexUsage(usage.last || usage.total || {});
}

function normalizeCodexUsage(raw) {
  const totals = normalizeTotals(raw);
  // Codex reports input inclusive of cache reads.
  totals.input_tokens = Math.max(0, totals.input_tokens - totals.cached_input_tokens);
  totals.total_tokens =
    totals.input_tokens +
    totals.cached_input_tokens +
    totals.cache_creation_input_tokens +
    totals.output_tokens;
  return totals;
}

function addCodexContext(byDay, timestamp, delta, tools) {
  if (!delta?.total_tokens || !timestamp) return;
  const day = String(timestamp).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const row = byDay.get(day) || emptyContextRow(day, "turn_delta");
  const uniqueTools = [...new Set((tools || []).filter(Boolean))];
  const toolShare = uniqueTools.length > 0 ? 1 : 0;
  const reasoning = Math.min(delta.total_tokens, number(delta.reasoning_output_tokens));
  const attributable = Math.max(0, delta.total_tokens - reasoning);
  row.categories.reasoning += reasoning;
  row.categories.tool_calls += attributable * toolShare;
  row.categories.messages += attributable * (1 - toolShare);
  row.total_tokens += delta.total_tokens;
  row.input_tokens += number(delta.input_tokens)
    + number(delta.cached_input_tokens)
    + number(delta.cache_creation_input_tokens);
  row.cached_input_tokens += number(delta.cached_input_tokens);
  row.tool_call_count += uniqueTools.length;
  row.event_count += 1;
  byDay.set(day, row);
}

function emptyContextRow(day, method) {
  return {
    day,
    method,
    categories: {
      messages: 0,
      tool_calls: 0,
      reasoning: 0,
      system_prompt: 0,
      custom_agents: 0,
    },
    total_tokens: 0,
    input_tokens: 0,
    cached_input_tokens: 0,
    tool_call_count: 0,
    event_count: 0,
  };
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

module.exports = {
  inspectCodex,
  extractCodexPrompt,
  stripCodexInjectedContext,
  extractCodexTokens,
  extractCodexTool,
  extractCodexUsageEvent,
  codexUsageDelta,
};
