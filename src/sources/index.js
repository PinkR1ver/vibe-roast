const { inspectCodex } = require("./codex");
const { inspectClaude } = require("./claude");
const { inspectCursor } = require("./cursor");
const { inspectVibeTracker } = require("./vibe-tracker");
const { inspectCline } = require("./cline");
const { inspectRoo } = require("./roo");
const { inspectContinue } = require("./continue");
const { inspectGemini } = require("./gemini");
const { inspectAider } = require("./aider");
const { inspectWindsurf } = require("./windsurf");
const { inspectCopilot } = require("./copilot");
const { inspectAmazonQ } = require("./amazonq");
const { inspectAntigravity } = require("./antigravity");
const { inspectOpenCode } = require("./opencode");

const SOURCE_INSPECTORS = {
  codex: inspectCodex,
  claude: inspectClaude,
  cursor: inspectCursor,
  "vibe-tracker": inspectVibeTracker,
  cline: inspectCline,
  roo: inspectRoo,
  continue: inspectContinue,
  gemini: inspectGemini,
  aider: inspectAider,
  windsurf: inspectWindsurf,
  copilot: inspectCopilot,
  amazonq: inspectAmazonQ,
  antigravity: inspectAntigravity,
  opencode: inspectOpenCode,
};

/** Primary + best-effort mainstream local agents. Missing dirs return empty counts. */
const DEFAULT_SOURCES = [
  "codex",
  "claude",
  "cursor",
  "cline",
  "roo",
  "continue",
  "gemini",
  "aider",
  "windsurf",
  "copilot",
  "amazonq",
  "antigravity",
  "opencode",
];

const KNOWN_SOURCES = Object.keys(SOURCE_INSPECTORS);

function normalizeSources(sources) {
  if (typeof sources === "string") {
    return sources
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Array.isArray(sources) && sources.length > 0
    ? sources
    : DEFAULT_SOURCES.slice();
}

module.exports = {
  SOURCE_INSPECTORS,
  DEFAULT_SOURCES,
  KNOWN_SOURCES,
  normalizeSources,
};
