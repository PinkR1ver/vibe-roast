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

// Witty supplementary tags: pool of creative, meme-worthy, screenshot-ready tags
// Organized by behavioral theme so selection stays loosely evidence-grounded
const WITTY_POOLS = [
  {
    theme: "ship_fast",
    condition: ({ dims }) => (dims.ship || 0) >= 70 && (dims.debug || 0) <= 30,
    tags: [
      { en: "ShipFirstAskLater", zh: "先上线再说" },
      { en: "TestInProd", zh: "生产环境就是测试" },
      { en: "YOLODeploy", zh: "YOLO部署" },
      { en: "HotfixAt3AM", zh: "凌晨三点修Bug" },
      { en: "FridayDeploy", zh: "周五发版勇士" },
      { en: "CommitAndPray", zh: "提交并祈祷" },
      { en: "WorksOnMyMachine", zh: "我机器上能跑" },
    ],
  },
  {
    theme: "build_beast",
    condition: ({ dims, cats }) => (dims.build || 0) >= 75 && (cats.implementation || 0) > 0,
    tags: [
      { en: "StackAddict", zh: "连写十小时代码" },
      { en: "CodeTsunami", zh: "代码海啸" },
      { en: "CompileKing", zh: "编译之王" },
      { en: "DependencyHoarder", zh: "依赖收藏家" },
      { en: "ImportStar", zh: "通配符导入侠" },
      { en: "CtrlC_CtrlV_MVP", zh: "CV工程师" },
    ],
  },
  {
    theme: "debug_hell",
    condition: ({ dims, cats }) => (dims.debug || 0) >= 60 || (cats.debugging || 0) > 0,
    tags: [
      { en: "BugArchaeologist", zh: "Bug考古学家" },
      { en: "StackTracePoet", zh: "堆栈诗人" },
      { en: "NullPointerProphet", zh: "空指针先知" },
      { en: "OffByOne", zh: "差一Bug" },
      { en: "BreakpointBuddhist", zh: "断点禅修者" },
      { en: "ConsoleLogSherlock", zh: "控制台福尔摩斯" },
    ],
  },
  {
    theme: "context_lite",
    condition: ({ dims }) => (dims.context || 100) <= 25,
    tags: [
      { en: "ContextIsOptional", zh: "上下文是选项" },
      { en: "TLDRCoder", zh: "太长不读型码农" },
      { en: "GoldfishMemory", zh: "金鱼记忆" },
      { en: "MinimalContextGang", zh: "精简上下文党" },
    ],
  },
  {
    theme: "context_heavy",
    condition: ({ dims }) => (dims.context || 0) >= 75,
    tags: [
      { en: "ContextMaxxing", zh: "上下文拉满" },
      { en: "NovelistPrompt", zh: "写小说式提示" },
      { en: "TokenBlackHole", zh: "Token黑洞" },
    ],
  },
  {
    theme: "orchestration",
    condition: ({ dims }) => (dims.orchestration || 0) >= 60,
    tags: [
      { en: "AgentWrangler", zh: "Agent驯兽师" },
      { en: "MultiAgentMayhem", zh: "多Agent混战" },
      { en: "OrchestraConductor", zh: "AI交响乐指挥" },
    ],
  },
  {
    theme: "prompt_craft",
    condition: ({ dims }) => (dims.promptCraft || 0) >= 70,
    tags: [
      { en: "PromptEngineer", zh: "提示词工程师" },
      { en: "SpellCaster", zh: "咒语施法者" },
      { en: "PromptPoet", zh: "提示词诗人" },
      { en: "TemperatureTuner", zh: "温度调参师" },
    ],
  },
  {
    theme: "ai_addict",
    condition: () => true,
    tags: [
      { en: "AIOverlord", zh: "AI霸总" },
      { en: "TokenBurner", zh: "Token焚化炉" },
      { en: "VibeCoder", zh: "Vibe码农" },
      { en: "RoastMeHarder", zh: "求毒舌" },
      { en: "CertifiedVibe", zh: "认证Vibe" },
      { en: "LLMDrivenDev", zh: "大模型驱动开发" },
      { en: "CursorWarrior", zh: "Cursor战士" },
      { en: "RubberDuckCEO", zh: "橡皮鸭CEO" },
    ],
  },
  {
    theme: "tier_flex",
    condition: ({ tierId }) => tierId === "GOD" || tierId === "ELITE",
    tags: [
      { en: "VibeCheckPassed", zh: "Vibe检测通过" },
      { en: "RoastProof", zh: "耐喷认证" },
      { en: "NoImpostorHere", zh: "没有冒充者" },
    ],
  },
  {
    theme: "tier_humble",
    condition: ({ tierId }) => tierId === "NPC" || tierId === "TRASH",
    tags: [
      { en: "RoastMeSoftly", zh: "轻点喷" },
      { en: "VibeInProgress", zh: "Vibe加载中" },
      { en: "UnderConstruction", zh: "施工中" },
    ],
  },
  {
    theme: "ui_design",
    condition: ({ cats }) => (cats.ui_design || 0) > 0,
    tags: [
      { en: "PixelPusher", zh: "像素推手" },
      { en: "CSSBattle", zh: "CSS格斗家" },
      { en: "FlexboxFlexer", zh: "Flexbox炫技" },
    ],
  },
  {
    theme: "refactor",
    condition: ({ cats }) => (cats.refactor || 0) > 0,
    tags: [
      { en: "RefactorLater", zh: "稍后重构" },
      { en: "TechDebtCollector", zh: "技术债收藏家" },
    ],
  },
  {
    theme: "general_spice",
    condition: () => true,
    tags: [
      { en: "DarkModeOnly", zh: "只开暗黑模式" },
      { en: "MergeConflictSurvivor", zh: "合并冲突幸存者" },
      { en: "GreenTestsOnly", zh: "绿了就过" },
      { en: "CodeIsPoetry", zh: "代码即诗歌" },
      { en: "SemanticSatellite", zh: "语义卫星" },
      { en: "TabArmy", zh: "标签军团" },
      { en: "GhostCommit", zh: "幽灵提交者" },
    ],
  },
];

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

function dimensionValue(dimensions, key) {
  const dim = (dimensions || []).find((d) => d.key === key);
  if (!dim) return 0;
  return typeof dim.value === "number" ? dim.value : 0;
}

function buildDimensionMap(dimensions) {
  const map = {};
  for (const dim of dimensions || []) {
    map[dim.key] = typeof dim.value === "number" ? dim.value : 0;
  }
  return map;
}

function shuffleSlice(array, count) {
  const pool = [...array];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Select 1-3 witty supplementary tags from the pools based on evidence.
 */
function pickWittyTags(vibe, categories = {}, zh = false, count = 3) {
  const dimensions = vibe?.dimensions || [];
  const dims = buildDimensionMap(dimensions);
  const cats = {};
  for (const [key, row] of Object.entries(categories || {})) {
    cats[key] = typeof row === "number" ? row : (row?.count || 0);
  }
  const tierId = vibe?.tier?.id || "";

  const ctx = { dims, cats, tierId };
  const candidates = [];

  for (const pool of WITTY_POOLS) {
    if (pool.condition(ctx)) {
      for (const tag of pool.tags) {
        candidates.push(tag);
      }
    }
  }

  // Prefer tags from more specific pools by collecting themes hit
  const selected = shuffleSlice(candidates, count * 2).slice(0, count);
  return selected.map((tag) => zh ? tag.zh : tag.en);
}

/**
 * @param {object} vibe - vibe_profile
 * @param {object} [categories] - prompt_analysis.categories
 * @param {{ limit?: number, locale?: "en"|"zh" }} [opts]
 * @returns {string[]} tags with leading `#`
 */
export function buildHashtags(vibe, categories = {}, opts = {}) {
  const limit = opts.limit ?? 10;
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

  // --- Standard tags (unchanged) ---

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

  // Top 2 categories
  const ranked = Object.keys(CATEGORY_TAGS)
    .map((key) => [key, categoryCount(categories, key)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (let i = 0; i < Math.min(2, ranked.length); i += 1) {
    push(pickLocale(CATEGORY_TAGS[ranked[i][0]], zh));
  }

  // Hook word
  const hookSrc = zh ? arch.hookZh || arch.hook : arch.hook;
  if (hookSrc) {
    const hookWord = String(hookSrc).split(/[\s·•\-–—,/，、]+/)[0];
    if (hookWord && hookWord.length > 1) {
      push(zh ? hookWord : pascalCase(hookWord));
    }
  }

  // --- Witty supplementary tags ---
  // Reserve space for witty tags: stop standard tags early if needed
  const wittyCount = Math.min(3, limit - tags.length);
  if (wittyCount > 0) {
    const wittyTags = pickWittyTags(vibe, categories, zh, wittyCount + 2);
    for (const witty of wittyTags) {
      if (tags.length >= limit) break;
      push(witty);
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
