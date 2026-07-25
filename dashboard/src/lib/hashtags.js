/** Derive shareable #hashtags from vibe profile + category signals (EN / ZH). */

const ARCHETYPE_TAGS = {
  "01-builder": { en: "Builder", zh: "构建侠" },
  "02-debugger": { en: "Debugger", zh: "调试猎手" },
  "03-architect": { en: "Architect", zh: "架构师" },
  "04-codex-believer": { en: "CodexBeliever", zh: "Codex信徒" },
  "05-prompt-priest": { en: "PromptPriest", zh: "提示祭司" },
  "06-tab-hoarder": { en: "TabHoarder", zh: "标签囤积癖" },
  "07-context-maxxer": { en: "ContextMaxxer", zh: "上下文极限党" },
  "08-yolo-shipper": { en: "YoloShipper", zh: "YOLO上线狂" },
};

const CODE_TAGS = {
  SHIP: { en: "ShipIt", zh: "直接上线" },
  HUNT: { en: "BugHunt", zh: "猎虫" },
  DRAW: { en: "Blueprint", zh: "蓝图先行" },
  FAITH: { en: "CodexFaith", zh: "Codex信仰" },
  SPELL: { en: "SpellCraft", zh: "法术工艺" },
  TABS: { en: "TabHoard", zh: "标签囤积" },
  METER: { en: "CtxMeter", zh: "上下文表" },
  YOLO: { en: "YoloShip", zh: "YOLO发车" },
};

const CATEGORY_TAGS = {
  planning: { en: "Planning", zh: "规划" },
  debugging: { en: "Debugging", zh: "调试" },
  implementation: { en: "Implementation", zh: "实现" },
  refactor: { en: "Refactor", zh: "重构" },
  testing: { en: "Testing", zh: "测试" },
  packaging: { en: "Packaging", zh: "打包" },
  explanation: { en: "Explanation", zh: "讲解" },
  research: { en: "Research", zh: "调研" },
  ui_design: { en: "UIDesign", zh: "UI设计" },
  workflow: { en: "Workflow", zh: "工作流" },
};

const TIER_TAGS = {
  GOD: { en: "GOD", zh: "神级" },
  ELITE: { en: "ELITE", zh: "精英" },
  SOLID: { en: "SOLID", zh: "扎实" },
  NPC: { en: "NPC", zh: "路人甲" },
  TRASH: { en: "TRASH", zh: "垃分" },
};

function pickLocale(entry, zh) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return zh ? entry.zh || entry.en : entry.en || entry.zh;
}

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

/**
 * @param {object} vibe - vibe_profile
 * @param {object} [categories] - prompt_analysis.categories
 * @param {{ limit?: number, locale?: "en"|"zh" }} [opts]
 * @returns {string[]} tags with leading `#`
 */
export function buildHashtags(vibe, categories = {}, opts = {}) {
  const limit = opts.limit ?? 8;
  const zh = opts.locale === "zh";
  const tags = [];
  const seen = new Set();

  function push(raw) {
    const bare = String(raw || "")
      .replace(/^#+/, "")
      .replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, "");
    if (!bare) return;
    const tag = `#${bare}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  }

  const arch = vibe?.archetype || {};
  const archId = arch.id || "";
  if (ARCHETYPE_TAGS[archId]) {
    push(pickLocale(ARCHETYPE_TAGS[archId], zh));
  } else if (arch.title) {
    push(zh ? arch.title : pascalCase(arch.title));
  }

  if (arch.code && CODE_TAGS[arch.code]) {
    push(pickLocale(CODE_TAGS[arch.code], zh));
  } else if (arch.code) {
    push(/^[MA][OP][VS][FX]$/.test(arch.code) ? arch.code : pascalCase(arch.code));
  }

  const tierId = vibe?.tier?.id;
  if (!vibe?.type_code && tierId && TIER_TAGS[tierId]) push(pickLocale(TIER_TAGS[tierId], zh));
  else if (!vibe?.type_code && tierId) push(tierId);

  const ranked = Object.keys(CATEGORY_TAGS)
    .map((key) => [key, categoryCount(categories, key)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [key] of ranked) {
    push(pickLocale(CATEGORY_TAGS[key], zh));
    if (tags.length >= limit) break;
  }

  const hookSrc = zh ? arch.hookZh || arch.hook : arch.hook;
  if (hookSrc) {
    const hookWord = String(hookSrc).split(/[\s·•\-–—,/，、]+/)[0];
    if (hookWord && hookWord.length > 1) {
      push(zh ? hookWord : pascalCase(hookWord));
    }
  }

  return tags.slice(0, limit);
}

export function mergeHashtags(generated = [], limit = 8) {
  const tags = [];
  const seen = new Set();
  for (const raw of generated || []) {
    const bare = String(raw || "")
      .replace(/^#+/, "")
      .replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, "");
    if (!bare) continue;
    const key = bare.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(`#${bare}`);
  }
  return tags.slice(0, limit);
}

export { ARCHETYPE_TAGS, CODE_TAGS, CATEGORY_TAGS, TIER_TAGS };
