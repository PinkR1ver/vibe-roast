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
  const contextByDay = new Map();
  const seenContextMessages = new Set();

  for (const file of files) {
    const sessionState = { systemPrefixSeen: false };
    const contextMessages = new Map();
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

      if (tokens?.total_tokens > 0) collectClaudeContextMessage(contextMessages, obj, timestamp);
    });

    for (const message of contextMessages.values()) {
      if (message.key && seenContextMessages.has(message.key)) continue;
      if (message.key) seenContextMessages.add(message.key);
      addClaudeContext(contextByDay, message.timestamp, {
        message: {
          usage: message.usage,
          content: message.content,
        },
      }, sessionState);
    }
  }

  return {
    source: "claude",
    root: projectsRoot,
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    context_breakdown_daily: [...contextByDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
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

function claudeContextKey(obj) {
  const messageId = obj?.message?.id || "";
  const requestId = obj?.requestId || obj?.request_id || "";
  if (!messageId && !requestId) return "";
  return `${messageId}|${requestId}`;
}

function collectClaudeContextMessage(messages, obj, timestamp) {
  const key = claudeContextKey(obj) || `${timestamp}|${messages.size}`;
  const usage = obj?.message?.usage || obj?.usage;
  const content = Array.isArray(obj?.message?.content) ? obj.message.content : [];
  const current = messages.get(key) || {
    key: claudeContextKey(obj),
    timestamp,
    usage,
    content: [],
    blockKeys: new Set(),
  };
  if (claudeUsageTotal(usage) >= claudeUsageTotal(current.usage)) current.usage = usage;
  current.timestamp = current.timestamp || timestamp;

  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const blockKey = block.id
      ? `${block.type || ""}:${block.id}`
      : JSON.stringify(block);
    if (current.blockKeys.has(blockKey)) continue;
    current.blockKeys.add(blockKey);
    current.content.push(block);
  }
  messages.set(key, current);
}

function claudeUsageTotal(usage) {
  return number(usage?.input_tokens)
    + number(usage?.cache_read_input_tokens || usage?.cached_input_tokens)
    + number(usage?.cache_creation_input_tokens)
    + number(usage?.output_tokens);
}

function addClaudeContext(byDay, timestamp, obj, sessionState) {
  if (!timestamp) return;
  const day = String(timestamp).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const usage = obj?.message?.usage || obj?.usage;
  if (!usage) return;

  const input = number(usage.input_tokens);
  const cached = number(usage.cache_read_input_tokens || usage.cached_input_tokens);
  const cacheCreation = number(usage.cache_creation_input_tokens);
  const output = number(usage.output_tokens);
  const row = byDay.get(day) || emptyContextRow(day, "content_blocks");

  row.categories.messages += input + cached;
  if (cacheCreation > 0 && !sessionState.systemPrefixSeen) {
    row.categories.system_prompt += cacheCreation;
    sessionState.systemPrefixSeen = true;
  } else {
    row.categories.messages += cacheCreation;
  }

  const outputSplit = splitClaudeOutput(output, number(usage.reasoning_output_tokens), obj?.message?.content);
  row.categories.messages += outputSplit.messages;
  row.categories.tool_calls += outputSplit.tool_calls;
  row.categories.reasoning += outputSplit.reasoning;
  row.categories.custom_agents += outputSplit.custom_agents;
  row.total_tokens += input + cached + cacheCreation + output;
  row.input_tokens += input + cached + cacheCreation;
  row.cached_input_tokens += cached;
  row.tool_call_count += outputSplit.tool_call_count;
  row.event_count += 1;
  byDay.set(day, row);
}

function splitClaudeOutput(total, explicitReasoning, content) {
  const blocks = Array.isArray(content) ? content : [];
  const weights = { messages: 0, tool_calls: 0, reasoning: 0, custom_agents: 0 };
  let toolCallCount = 0;

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text") {
      weights.messages += String(block.text || "").length || 1;
    } else if (block.type === "thinking") {
      weights.reasoning += String(block.thinking || block.text || "").length || 1;
    } else if (block.type === "tool_use") {
      const weight = String(block.name || "").length
        + (block.input ? JSON.stringify(block.input).length : 0)
        + 1;
      const category = block.name === "Agent" || block.name === "Task"
        ? "custom_agents"
        : "tool_calls";
      weights[category] += weight;
      toolCallCount += 1;
    }
  }

  const reasoning = Math.min(total, explicitReasoning);
  const remaining = Math.max(0, total - reasoning);
  if (reasoning > 0) weights.reasoning = 0;
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const allocated = { messages: 0, tool_calls: 0, reasoning, custom_agents: 0 };

  if (weightTotal <= 0) {
    allocated.messages = remaining;
  } else {
    let used = 0;
    for (const key of ["tool_calls", "custom_agents", "reasoning"]) {
      allocated[key] += Math.floor(remaining * (weights[key] / weightTotal));
      used += Math.floor(remaining * (weights[key] / weightTotal));
    }
    allocated.messages = remaining - used;
  }

  return { ...allocated, tool_call_count: toolCallCount };
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

module.exports = {
  inspectClaude,
  extractClaudePrompt,
  extractClaudeTokens,
  collectClaudeContextMessage,
  splitClaudeOutput,
};
