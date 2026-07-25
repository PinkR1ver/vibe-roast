/** Prompt-behaviour personality engine: four dichotomies, sixteen vibe types. */

const DIMENSIONS = [
  ["orchestration", "Agent orchestration", "Agent 编排", "Workflow delegation density", "工作流与委派密度"],
  ["promptCraft", "Prompt craft", "提示词手艺", "Intent clarity vs pasted noise", "清晰意图 vs 粘贴噪音"],
  ["build", "Build drive", "构建驱动力", "Implementation and packaging", "实现与打包倾向"],
  ["debug", "Verification drive", "验证驱动力", "Debug, tests, and refactors", "调试、测试与重构"],
  ["context", "Context appetite", "上下文胃口", "Long prompts and reference payloads", "长提示与引用负载"],
  ["ship", "Shipping bias", "交付倾向", "Execution over deliberation", "执行相对思考的倾向"],
].map(([key, label, labelZh, hint, hintZh]) => ({ key, label, labelZh, hint, hintZh, max: 100 }));

const PERSONALITY_ROWS = [
  ["MOVF", "Agent Engineer", "Agent 工程师", "Turns agents into a tested assembly line", "把 Agent 变成带质检的流水线", "#2bbf9b"],
  ["MOVX", "Systems Wrangler", "系统牧场主", "Herds agents through a context thunderstorm", "在上下文雷暴里放牧 Agent", "#3aa6a0"],
  ["MOSF", "YOLO Shipper", "YOLO 发车手", "Automates the merge button's intrusive thoughts", "把 merge 键的冲动想法自动化", "#ef5b45"],
  ["MOSX", "Agent Commander", "Agent 总指挥", "Runs a war room where every tab has a rank", "开着每个标签都有军衔的作战室", "#e56b54"],
  ["MPVF", "Debugger", "调试猎手", "Cross-examines one bug until it confesses", "审到一个 bug 主动招供", "#e65b89"],
  ["MPVX", "Context Maxxer", "上下文极限党", "Brings the whole repo to a one-line bug", "为一行 bug 搬来整个仓库", "#35a9c5"],
  ["MPSF", "Builder", "构建侠", "Converts short prompts into suspiciously fast demos", "把短提示变成快得可疑的 demo", "#25b985"],
  ["MPSX", "Tab Hoarder", "标签囤积癖", "Needs forty-seven tabs to ship one button", "需要四十七个标签才能上线一个按钮", "#e58a39"],
  ["AOVF", "Systems Architect", "系统架构师", "Makes the agent read the ADR before touching a key", "让 Agent 碰键盘前先读 ADR", "#557fd8"],
  ["AOVX", "Context Cartographer", "上下文制图师", "Maps every dependency before crossing the repo", "穿越仓库前先画完每条依赖", "#6686c7"],
  ["AOSF", "Strategy Shipper", "战略交付官", "Ships the roadmap while everyone debates the map", "别人争地图时已经把路线图上线", "#8a72d6"],
  ["AOSX", "Agent Believer", "Agent 信徒", "Builds a cathedral out of tools and context", "用工具与上下文盖一座大教堂", "#9a70cf"],
  ["APVF", "Architect", "架构师", "Reviews the rectangle before allowing it to run", "矩形通过评审后才允许它运行", "#5678c7"],
  ["APVX", "Prompt Priest", "提示祭司", "Writes scripture long enough to need version control", "经文长到需要单独做版本控制", "#d4a334"],
  ["APSF", "Diagram Sprinter", "框图冲刺手", "Draws three systems, then ships the smallest box", "画三套系统，再上线最小那个框", "#cf7850"],
  ["APSX", "Infinite Planner", "无限规划师", "One more context file away from starting", "永远只差再读一个文件就开工", "#9c75b9"],
];

const PERSONALITIES = Object.fromEntries(PERSONALITY_ROWS.map(([code, title, titleZh, hook, hookZh, accent]) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return [code, { id: code, code, title, titleZh, hook, hookZh, accent, folder: `${code.toLowerCase()}-${slug}`, name: slug }];
}));

const LEGACY_FIGURES = {
  MOVF: "01-builder/builder", MOVX: "07-context-maxxer/context-maxxer", MOSF: "08-yolo-shipper/yolo-shipper", MOSX: "04-codex-believer/codex-believer",
  MPVF: "02-debugger/debugger", MPVX: "07-context-maxxer/context-maxxer", MPSF: "01-builder/builder", MPSX: "06-tab-hoarder/tab-hoarder",
  AOVF: "03-architect/architect", AOVX: "07-context-maxxer/context-maxxer", AOSF: "03-architect/architect", AOSX: "04-codex-believer/codex-believer",
  APVF: "03-architect/architect", APVX: "05-prompt-priest/prompt-priest", APSF: "03-architect/architect", APSX: "05-prompt-priest/prompt-priest",
};

const AXIS_DEFS = [
  { key: "maker_architect", left: ["M", "Maker", "造物派"], right: ["A", "Architect", "架构派"] },
  { key: "orchestrator_promptsmith", left: ["O", "Orchestrator", "编排派"], right: ["P", "Promptsmith", "提示派"] },
  { key: "verifier_shipper", left: ["V", "Verifier", "验证派"], right: ["S", "Shipper", "交付派"] },
  { key: "focused_maxcontext", left: ["F", "Focused", "聚焦派"], right: ["X", "Max-context", "满上下文派"] },
];

function categoryCount(categories, name) {
  const row = categories?.[name];
  const value = typeof row === "number" ? row : Number(row?.count || 0);
  return Number.isFinite(value) ? value : 0;
}

function ratioScore(numerator, denominator) {
  return denominator > 0 ? Math.round(Math.min(1, Math.max(0, numerator / denominator)) * 1000) / 10 : 0;
}

function scoreFromCategories(categories = {}, _env = {}, promptAnalysis = {}) {
  const c = (name) => categoryCount(categories, name);
  const useful = ["implementation", "debugging", "planning", "research", "ui_design", "explanation", "testing", "refactor", "packaging", "workflow"].reduce((sum, key) => sum + c(key), 0);
  if (useful <= 0) return Object.fromEntries(DIMENSIONS.map((dim) => [dim.key, 0]));
  const usefulRatio = Number(promptAnalysis.useful_ratio ?? useful / Math.max(useful + c("reference"), 1));
  const longRatio = Number(promptAnalysis.long_prompt_ratio || 0);
  return {
    orchestration: ratioScore(c("workflow") * 2, useful * 0.45),
    promptCraft: Math.round(Math.min(1, usefulRatio * 0.8 + ((c("planning") + c("explanation")) / useful) * 0.5) * 1000) / 10,
    build: ratioScore(c("implementation") + c("packaging") + c("ui_design") * 0.5, useful * 0.75),
    debug: ratioScore(c("debugging") + c("testing") + c("refactor") * 0.6, useful * 0.55),
    context: Math.round(Math.min(1, longRatio * 1.5 + (1 - usefulRatio) * 0.7) * 1000) / 10,
    ship: ratioScore(c("implementation") + c("packaging"), c("implementation") + c("packaging") + c("planning") + c("research") + c("debugging") + c("testing")),
  };
}

function splitAxis(def, leftEvidence, rightEvidence) {
  const total = leftEvidence + rightEvidence;
  const leftPercent = total > 0 ? Math.round((leftEvidence / total) * 100) : 50;
  const rightPercent = 100 - leftPercent;
  const chosen = leftPercent >= rightPercent ? def.left : def.right;
  return {
    key: def.key,
    letter: chosen[0],
    label: chosen[1],
    labelZh: chosen[2],
    left: { code: def.left[0], label: def.left[1], labelZh: def.left[2], percent: leftPercent },
    right: { code: def.right[0], label: def.right[1], labelZh: def.right[2], percent: rightPercent },
    margin: Math.abs(leftPercent - rightPercent),
  };
}

function classifyType(categories = {}, promptAnalysis = {}) {
  const c = (name) => categoryCount(categories, name);
  const usefulRatio = Number(promptAnalysis.useful_ratio ?? 1);
  const longRatio = Number(promptAnalysis.long_prompt_ratio || 0);
  const referenceRatio = Math.max(0, 1 - usefulRatio);
  const axes = [
    splitAxis(AXIS_DEFS[0], c("implementation") + c("packaging") + c("testing") + c("refactor") + c("debugging") + c("ui_design") * 0.5, c("planning") + c("research") + c("explanation") + c("ui_design") * 0.5),
    splitAxis(AXIS_DEFS[1], c("workflow") * 2 + c("planning") * 0.2, c("implementation") * 0.2 + c("explanation") + c("ui_design") * 0.35 + 0.25),
    splitAxis(AXIS_DEFS[2], c("debugging") + c("testing") + c("refactor") * 0.7, c("implementation") + c("packaging") + c("ui_design") * 0.25),
    splitAxis(AXIS_DEFS[3], Math.max(0.05, 1 - longRatio - referenceRatio), longRatio * 1.4 + referenceRatio * 1.2),
  ];
  return { code: axes.map((axis) => axis.letter).join(""), axes };
}

function confidenceFor(promptAnalysis, axes) {
  const useful = Number(promptAnalysis?.useful_prompt_count || 0);
  const sample = Math.min(1, useful / 80);
  const separation = axes.reduce((sum, axis) => sum + axis.margin, 0) / axes.length / 100;
  return Math.round(sample * (0.65 + separation * 0.35) * 100);
}

function confidenceTier(confidence) {
  if (confidence >= 75) return {
    id: "CLEAR",
    color: "#2bb673",
    emoji: "◆",
    blurb: "Strong sample · clear axis separation",
    blurbZh: "样本充足 · 行为轴区分清晰",
  };
  if (confidence >= 45) return {
    id: "EMERGING",
    color: "#d49a25",
    emoji: "◇",
    blurb: "Growing sample · mixed axis separation",
    blurbZh: "样本增长中 · 部分行为轴仍接近",
  };
  return {
    id: "LOW DATA",
    color: "#8b8680",
    emoji: "·",
    blurb: "More prompts needed · provisional type",
    blurbZh: "仍需更多提示 · 当前类型为暂定",
  };
}

function buildRoast(personality, axes, confidence, usefulCount) {
  if (usefulCount < 20) return {
    roast: `🔥 The scanner found ${usefulCount} useful prompts — enough for a vibe trailer, not a personality verdict. Your provisional type is ${personality.code}, but four letters this early are basically a horoscope wearing a terminal theme. Feed it at least 20 real requests before framing the result.`,
    roastZh: `🔥 扫描器只找到 ${usefulCount} 条有效提示——够剪一支预告片，不够给人格定案。暂定类型是 ${personality.code}，但这么早的四个字母，本质上只是穿了终端主题的星座运势。至少喂到 20 条真实请求再截图裱起来。`,
    tldr: "Provisional vibe; the dataset needs more receipts.", tldrZh: "暂定 vibe；样本还得继续交作业。",
  };
  const a = Object.fromEntries(axes.map((axis) => [axis.key, axis]));
  const closest = [...axes].sort((x, y) => x.margin - y.margin)[0];
  const en = {
    M: "You ask for working artifacts before the architecture committee finds a chair.", A: "You can turn a two-line feature into a diagram with municipal zoning.",
    O: "One agent is never enough; apparently the task also needs a command structure.", P: "You prefer one exquisitely instructed agent and a prompt with terms and conditions.",
    V: "Nothing ships until the bug has confessed and the tests have signed the statement.", S: "The merge button knows your fingerprint better than your test runner does.",
    F: "You ration context like carry-on luggage.", X: "You bring the entire repo to questions that could fit on a sticky note.",
  };
  const zh = {
    M: "架构委员会还没找到椅子，你已经要求交付可运行产物。", A: "两行需求到你手里，也能长成带城市规划的系统图。",
    O: "一个 Agent 显然不够，这个任务还必须拥有指挥体系。", P: "你偏爱一位被精密调教的 Agent，以及一份自带条款的提示词。",
    V: "bug 没招供、测试没签字，谁都别想上线。", S: "merge 键认得你的指纹，比测试运行器还熟。",
    F: "你分配上下文，像廉航分配随身行李。", X: "便利贴能装下的问题，你也要把整个仓库搬来。",
  };
  const letters = axes.map((axis) => axis.letter);
  return {
    roast: `🔥 ${personality.title}: ${personality.hook}. ${letters.map((letter) => en[letter]).join(" ")}\n\nYour closest split is ${closest.left.code}/${closest.right.code} at ${closest.left.percent}/${closest.right.percent}, so that supposedly permanent letter is one refactor away from switching teams. Confidence is ${confidence}% — evidence, not destiny.`,
    roastZh: `🔥 ${personality.titleZh}：${personality.hookZh}。${letters.map((letter) => zh[letter]).join("")}\n\n你最摇摆的是 ${closest.left.code}/${closest.right.code}（${closest.left.percent}/${closest.right.percent}），所以那个看似永久的字母，可能一次重构就叛变。置信度 ${confidence}%——这是证据，不是命运。`,
    tldr: `${personality.code}: ${personality.hook}.`, tldrZh: `${personality.code}：${personality.hookZh}。`,
  };
}

const { buildActivitySignals } = require("./activity-metrics");

function buildVibeProfile({ categories = {}, env = {}, summary = {}, promptAnalysis = {}, activity = {} } = {}) {
  const scores = scoreFromCategories(categories, env, promptAnalysis);
  const typed = classifyType(categories, promptAnalysis);
  const personality = PERSONALITIES[typed.code];
  const confidence = confidenceFor(promptAnalysis, typed.axes);
  const status = Number(promptAnalysis.useful_prompt_count || 0) >= 20 ? "ready" : "insufficient_data";
  const roast = buildRoast(personality, typed.axes, confidence, Number(promptAnalysis.useful_prompt_count || 0));
  return {
    status, confidence, type_code: typed.code, type_axes: typed.axes, scores,
    total: confidence, tier: confidenceTier(confidence),
    personality, archetype: personality,
    figure: `/assests/characters-vibe-types/${personality.folder}/${personality.name}-figure.png`,
    figure_fallback: `/assests/characters/${LEGACY_FIGURES[typed.code].split("/")[0]}/${LEGACY_FIGURES[typed.code].split("/")[1]}-figure.png`,
    badge: null,
    dimensions: DIMENSIONS.map((dim) => ({ ...dim, value: scores[dim.key], score: scores[dim.key] / 100 })),
    signals: buildActivitySignals({ activity, summary, categories }),
    ...roast,
  };
}

module.exports = { DIMENSIONS, PERSONALITIES, AXIS_DEFS, scoreFromCategories, classifyType, confidenceFor, buildRoast, buildVibeProfile };
