#!/usr/bin/env node
/* Vibe Wrapper SessionEnd hook — receives hook data from stdin,
   reads the transcript to extract token usage, appends to local store. */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createInterface } = require("node:readline");

const STORE_DIR = path.join(os.homedir(), ".vibe-wrapper");
const STORE_FILE = path.join(STORE_DIR, "sessions.jsonl");

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  let source = "unknown";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) { source = args[i + 1]; break; }
  }

  // Read hook payload from stdin
  const input = await readStdin();
  let payload = {};
  try { payload = JSON.parse(input); } catch {
    // Not JSON — try extracting from stdout-like format
    payload = { raw: input };
  }

  const sessionId = payload.session_id || "unknown";
  const transcriptPath = payload.transcript_path || null;
  const cwd = payload.cwd || "";
  const reason = payload.reason || "unknown";
  const endedAt = new Date().toISOString();

  // Extract token usage from transcript
  let tokenUsage = null;
  let model = null;

  if (transcriptPath) {
    try {
      const data = await readTranscript(transcriptPath);
      tokenUsage = data.usage;
      model = data.model;
    } catch {
      // Transcript unreadable — write basic record anyway
    }
  }

  const record = {
    source,
    session_id: sessionId,
    ended_at: endedAt,
    ended_reason: reason,
    cwd,
    model: model || payload.model || null,
    input_tokens: tokenUsage?.input_tokens || payload.input_tokens || 0,
    output_tokens: tokenUsage?.output_tokens || payload.output_tokens || 0,
    cached_input_tokens: tokenUsage?.cached_input_tokens || payload.cached_input_tokens || 0,
    cache_creation_input_tokens: tokenUsage?.cache_creation_input_tokens || payload.cache_creation_input_tokens || 0,
    total_tokens: tokenUsage?.total_tokens || payload.total_tokens ||
      ((tokenUsage?.input_tokens || 0) + (tokenUsage?.output_tokens || 0)),
  };

  // Append to store
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.appendFileSync(STORE_FILE, JSON.stringify(record) + "\n");

  // Return success (non-blocking)
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve("{}"); return; }
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve("{}"));
    // Timeout after 5s — don't hang
    setTimeout(() => resolve(chunks.join("") || "{}"), 5000);
  });
}

async function readTranscript(transcriptPath) {
  const stream = fs.createReadStream(transcriptPath, "utf8");
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let lastModel = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let cacheCreationTokens = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.model) lastModel = msg.model;
      if (msg.usage) {
        inputTokens += Number(msg.usage.input_tokens || 0);
        outputTokens += Number(msg.usage.output_tokens || 0);
        cachedInputTokens += Number(msg.usage.cached_input_tokens || msg.usage.cache_read_input_tokens || 0);
        cacheCreationTokens += Number(msg.usage.cache_creation_input_tokens || 0);
      }
    } catch { /* skip malformed lines */ }
  }

  return {
    model: lastModel,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_input_tokens: cachedInputTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      total_tokens: inputTokens + outputTokens + cachedInputTokens + cacheCreationTokens,
    },
  };
}

main().catch(() => process.exit(0));
