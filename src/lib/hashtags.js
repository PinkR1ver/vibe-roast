/** Derive shareable #hashtags from vibe profile + category signals. */

const CODE_TAGS = {
  SHIP: "ShipIt",
  HUNT: "BugHunt",
  DRAW: "Blueprint",
  FAITH: "CodexFaith",
  SPELL: "SpellCraft",
  TABS: "TabHoard",
  METER: "CtxMeter",
  YOLO: "YoloShip",
};

const CATEGORY_TAGS = {
  planning: "Planning",
  debugging: "Debugging",
  implementation: "Implementation",
  refactor: "Refactor",
  testing: "Testing",
  packaging: "Packaging",
  explanation: "Explanation",
  research: "Research",
  ui_design: "UIDesign",
  workflow: "Workflow",
};

function pascalCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function categoryCount(categories, name) {
  const row = categories?.[name];
  if (row == null) return 0;
  if (typeof row === "number") return Number.isFinite(row) ? row : 0;
  const count = Number(row.count);
  return Number.isFinite(count) ? count : 0;
}

function buildHashtags(vibe, categories = {}, opts = {}) {
  const limit = opts.limit ?? 8;
  const tags = [];
  const seen = new Set();

  function push(raw) {
    const bare = String(raw || "").replace(/^#+/, "").replace(/[^A-Za-z0-9]/g, "");
    if (!bare) return;
    const tag = `#${bare}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  }

  const arch = vibe?.archetype || {};
  if (arch.title) push(pascalCase(arch.title));
  if (arch.code && CODE_TAGS[arch.code]) push(CODE_TAGS[arch.code]);
  else if (arch.code) push(pascalCase(arch.code));
  if (vibe?.tier?.id) push(vibe.tier.id);

  const ranked = Object.keys(CATEGORY_TAGS)
    .map((key) => [key, categoryCount(categories, key)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [key] of ranked) {
    push(CATEGORY_TAGS[key]);
    if (tags.length >= limit) break;
  }

  if (arch.hook) {
    const hookWord = String(arch.hook).split(/[\s·•\-–—,/]+/)[0];
    if (hookWord && hookWord.length > 2) push(pascalCase(hookWord));
  }

  return tags.slice(0, limit);
}

module.exports = { buildHashtags, CODE_TAGS };
