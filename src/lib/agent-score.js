/**
 * Coding-agent usage score engine (Node/CJS).
 * Axes mirror assests/scripts/score-engine.js — six weighted dims sum to 100.
 */

const DIMENSIONS = [
  { key: "orchestration", label: "Agent orchestration", labelZh: "Agent 编排", max: 20, hint: "Skills · MCP · multi-agent workflow" },
  { key: "promptCraft", label: "Prompt craft", labelZh: "提示词手艺", max: 18, hint: "Useful intent vs paste dumps" },
  { key: "build", label: "Build throughput", labelZh: "构建吞吐", max: 18, hint: "Implementation & packaging density" },
  { key: "debug", label: "Debug resilience", labelZh: "调试韧性", max: 14, hint: "Breakpoint stamina & root-cause chase" },
  { key: "context", label: "Context discipline", labelZh: "上下文纪律", max: 16, hint: "Window hygiene · no log farming" },
  { key: "ship", label: "Ship courage", labelZh: "上线勇气", max: 14, hint: "Merge energy vs review paralysis" },
];

const TIERS = [
  { id: "GOD", min: 88, color: "#e8a317", emoji: "🏆", blurb: "Legendary · Hall of Fame", blurbZh: "传说级 · 名人堂" },
  { id: "ELITE", min: 72, color: "#7c6cf0", emoji: "💎", blurb: "Top-tier agentic engineer", blurbZh: "顶尖 Agentic 工程选手" },
  { id: "SOLID", min: 55, color: "#2bb673", emoji: "🟢", blurb: "Reliable · ship-ready", blurbZh: "靠谱 · 能交付" },
  { id: "NPC", min: 35, color: "#8b8680", emoji: "😐", blurb: "Background cast · needs plot", blurbZh: "路人甲 · 缺主线" },
  { id: "TRASH", min: 0, color: "#e24b4b", emoji: "💩", blurb: "Low-signal · vibe-farmed", blurbZh: "低信号 · 疑似 vibe 刷分" },
];

const ARCHETYPES = {
  "01-builder": { folder: "01-builder", name: "builder", title: "Builder", code: "SHIP", accent: "#23d6a5", hook: "Deploy first", hookZh: "先部署再说" },
  "02-debugger": { folder: "02-debugger", name: "debugger", title: "Debugger", code: "HUNT", accent: "#ff6b9d", hook: "Duck at midnight", hookZh: "午夜小黄鸭" },
  "03-architect": { folder: "03-architect", name: "architect", title: "Architect", code: "DRAW", accent: "#5b8cff", hook: "Boxes before bytes", hookZh: "先画框再写码" },
  "04-codex-believer": { folder: "04-codex-believer", name: "codex-believer", title: "Codex Believer", code: "FAITH", accent: "#a78bfa", hook: "Agent disciple", hookZh: "Agent 门徒" },
  "05-prompt-priest": { folder: "05-prompt-priest", name: "prompt-priest", title: "Prompt Priest", code: "SPELL", accent: "#f0c14a", hook: "Rules scroll", hookZh: "规则卷轴" },
  "06-tab-hoarder": { folder: "06-tab-hoarder", name: "tab-hoarder", title: "Tab Hoarder", code: "TABS", accent: "#ff8a3d", hook: "47 localhost tabs", hookZh: "四十七个 localhost" },
  "07-context-maxxer": { folder: "07-context-maxxer", name: "context-maxxer", title: "Context Maxxer", code: "METER", accent: "#22d3ee", hook: "Gauge at 99%", hookZh: "仪表盘 99%" },
  "08-yolo-shipper": { folder: "08-yolo-shipper", name: "yolo-shipper", title: "YOLO Shipper", code: "YOLO", accent: "#f04343", hook: "Skip review merge", hookZh: "跳过 review 直接 merge" },
};

const ROAST_TEMPLATES = {
  "01-builder": {
    en: "🔥 You don't write code — you launch it. Build throughput is {build}/18 while debug sits at {debug}/14. The agent ships; you mash merge. Keep the rocket — loan HUNT the keyboard once a sprint.",
    zh: "🔥 你不是在写代码，你是在发射代码。构建 {build}/18，调试只有 {debug}/14。Agent 交付，你按 merge。火箭留下——每个 sprint 借给 HUNT 一次键盘。",
    tldr: "Deploy-first Builder: elite throughput, soft autopsy habit.",
    tldrZh: "Deploy-first Builder：吞吐封神，验尸偏软。",
  },
  "02-debugger": {
    en: "🔥 Your rubber duck has seniority. Debug resilience is {debug}/14; ship courage is {ship}/14 on PTO. You recite stack frames like poetry and still fear a green CI. Close the ticket.",
    zh: "🔥 你的小黄鸭工龄比你长。调试 {debug}/14，上线勇气 {ship}/14 在休假。堆栈能背成诗，绿 CI 仍不敢点。把 ticket 关了。",
    tldr: "Night-shift Debugger: finds truth, fears the merge button.",
    tldrZh: "夜班 Debugger：真相猎手，merge 恐惧症。",
  },
  "03-architect": {
    en: "🔥 Boxes before bytes. Prompt craft {promptCraft}/18 and orchestration {orchestration}/20 look gorgeous; build {build}/18 is still waiting for the ink to dry. Ship a rectangle that runs.",
    zh: "🔥 先画框再写码。提示词 {promptCraft}/18、编排 {orchestration}/20 很美；构建 {build}/18 还在等墨水干。请交付一个能跑的矩形。",
    tldr: "Architect who weaponizes diagrams; bytes arrive late.",
    tldrZh: "用框图当武器的 Architect；字节总是迟到。",
  },
  "04-codex-believer": {
    en: "🔥 You don't use the agent — you worship it. Orchestration {orchestration}/20 is cathedral-tier. When Codex sneezes, your repo catches a cold. Faith is powerful; skepticism is still a virtue.",
    zh: "🔥 你不是在用 Agent，你是在供奉它。编排 {orchestration}/20 已是大教堂级别。Codex 一打喷嚏，仓库就感冒。信仰强大——怀疑仍是美德。",
    tldr: "Codex Believer with a halo terminal and a thin review conscience.",
    tldrZh: "戴光环的 Codex Believer，review 良知偏薄。",
  },
  "05-prompt-priest": {
    en: "🔥 Your system prompt has chapters. Prompt craft {promptCraft}/18 is near-perfect; ship {ship}/14 is monastic abstinence. The scroll is holy — the binary still needs a baptism.",
    zh: "🔥 你的 system prompt 是分章节的。提示词 {promptCraft}/18 接近满分，上线 {ship}/14 像禁欲。卷轴是圣物——二进制还等着受洗。",
    tldr: "Prompt Priest: liturgy excellence, deployment fasting.",
    tldrZh: "Prompt Priest：礼仪满分，部署斋戒。",
  },
  "06-tab-hoarder": {
    en: "🔥 Context discipline collapsed to {context}/16 — a port zoo. You run four localhosts and ask the agent which one is real. Close twenty tabs; keep the one that compiles.",
    zh: "🔥 上下文纪律塌到 {context}/16——端口动物园。四个 localhost 还问 Agent 哪个是真的。关掉二十个标签；留下能编译的那个。",
    tldr: "Tab Hoarder: ships while the dock overflows.",
    tldrZh: "Tab Hoarder：码头溢出来也能交付。",
  },
  "07-context-maxxer": {
    en: "🔥 You treat the context window like a final exam booklet. Context {context}/16 is ironically high because you know exactly how close you are to blowing the meter. Leave 1% for oxygen.",
    zh: "🔥 你把上下文窗口当成期末试卷。纪律 {context}/16 反而很高，因为你精确知道离爆表还有多远。请给氧气留 1%。",
    tldr: "Context Maxxer living at 99% with a spreadsheet heart.",
    tldrZh: "Context Maxxer：仪表盘 99%，内心是表格。",
  },
  "08-yolo-shipper": {
    en: "🔥 Ship courage {ship}/14 ate the chart. Debug {debug}/14 is a missing person report. Production is your staging environment and Friday is your favorite day. Iconic until it isn't.",
    zh: "🔥 上线勇气 {ship}/14 吃干了图表。调试 {debug}/14 已失踪。生产即预发，周五是节日。传奇——直到某天不再有效。",
    tldr: "YOLO Shipper: merge first, invent tests in the apology PR.",
    tldrZh: "YOLO Shipper：先 merge，在道歉 PR 里补测试。",
  },
};

function categoryCount(categories, name) {
  const row = categories[name];
  if (row == null) return 0;
  if (typeof row === "number") return Number.isFinite(row) ? row : 0;
  const count = Number(row.count);
  return Number.isFinite(count) ? count : 0;
}

function scoreFromCategories(categories = {}, env = {}) {
  const c = (name) => categoryCount(categories, name);
  const totalUseful = Math.max(
    1,
    c("implementation") +
      c("debugging") +
      c("planning") +
      c("research") +
      c("ui_design") +
      c("explanation") +
      c("testing") +
      c("refactor") +
      c("packaging") +
      c("workflow"),
  );
  const reference = c("reference");
  const usefulRatio = totalUseful / Math.max(totalUseful + reference, 1);

  const skills = Number(env.skills?.count ?? 0);
  const mcp = Number(env.mcp_servers?.count ?? env.mcp_servers?.names?.length ?? 0);
  const plugins = Number(env.plugins?.count ?? env.plugins?.enabled_count ?? 0);

  const orchestrationRaw =
    (c("workflow") / totalUseful) * 12 +
    Math.min(skills, 12) * 0.35 +
    Math.min(mcp, 8) * 0.5 +
    Math.min(plugins, 6) * 0.25;
  const promptCraftRaw = usefulRatio * 14 + Math.min(c("explanation") + c("planning"), 20) * 0.2;
  const buildRaw = ((c("implementation") + c("packaging")) / totalUseful) * 18;
  const debugRaw = (c("debugging") / totalUseful) * 14;
  const contextRaw = usefulRatio * 12 + Math.max(0, 4 - (reference / Math.max(totalUseful, 1)) * 4);
  const shipRaw =
    ((c("packaging") + c("testing") * 0.4) / totalUseful) * 10 +
    (1 - Math.min(c("planning") / totalUseful, 0.6)) * 4;

  const clamp = (v, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.round(Math.min(max, Math.max(0, n)) * 10) / 10;
  };

  return {
    orchestration: clamp(orchestrationRaw, 20),
    promptCraft: clamp(promptCraftRaw, 18),
    build: clamp(buildRaw, 18),
    debug: clamp(debugRaw, 14),
    context: clamp(contextRaw, 16),
    ship: clamp(shipRaw, 14),
  };
}

function totalScore(scores) {
  return Math.round(Object.values(scores).reduce((sum, value) => sum + Number(value || 0), 0) * 10) / 10;
}

function tierFor(score) {
  return TIERS.find((tier) => score >= tier.min) || TIERS[TIERS.length - 1];
}

function dominantArchetype(scores) {
  const map = [
    ["orchestration", "04-codex-believer"],
    ["promptCraft", "05-prompt-priest"],
    ["build", "01-builder"],
    ["debug", "02-debugger"],
    ["context", "07-context-maxxer"],
    ["ship", "08-yolo-shipper"],
  ];
  let best = map[0];
  let bestVal = -1;
  for (const row of map) {
    const value = Number(scores[row[0]] || 0);
    if (value > bestVal) {
      bestVal = value;
      best = row;
    }
  }
  if (scores.build >= 14 && scores.ship >= 10) return "01-builder";
  if (scores.debug >= 11) return "02-debugger";
  if (scores.promptCraft >= 14 && scores.orchestration < 10) return "05-prompt-priest";
  if (scores.orchestration >= 15) return "04-codex-believer";
  if (scores.context <= 6 && scores.build >= 8) return "06-tab-hoarder";
  if (scores.context >= 13 && scores.promptCraft >= 12) return "07-context-maxxer";
  if (scores.ship >= 11 && scores.debug <= 5) return "08-yolo-shipper";
  if (scores.promptCraft >= 12 && scores.build <= 8 && scores.orchestration >= 8) return "03-architect";
  return best[1];
}

function fillTemplate(template, scores) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(scores[key] ?? ""));
}

function buildRoast(archetypeId, scores) {
  const template = ROAST_TEMPLATES[archetypeId] || ROAST_TEMPLATES["01-builder"];
  return {
    roast: fillTemplate(template.en, scores),
    roastZh: fillTemplate(template.zh, scores),
    tldr: template.tldr,
    tldrZh: template.tldrZh,
  };
}

function buildVibeProfile({ categories = {}, env = {}, summary = {}, promptAnalysis = {} } = {}) {
  const scores = scoreFromCategories(categories, env);
  const total = totalScore(scores);
  const tier = tierFor(total);
  const archetypeId = dominantArchetype(scores);
  const archetype = ARCHETYPES[archetypeId];
  const roast = buildRoast(archetypeId, scores);
  const useful = Number(promptAnalysis.useful_prompt_count || summary.prompt_count || 0);
  const topCategory = Object.entries(categories)
    .filter(([key]) => key !== "reference")
    .map(([key, row]) => [key, categoryCount(categories, key)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    scores,
    total,
    tier,
    archetype: {
      id: archetypeId,
      ...archetype,
    },
    figure: `/assests/characters/${archetype.folder}/${archetype.name}-figure.png`,
    badge: `/assests/badges/${archetype.folder}/${archetype.name}-badge.svg`,
    dimensions: DIMENSIONS.map((dim) => ({
      key: dim.key,
      label: dim.label,
      labelZh: dim.labelZh,
      hint: dim.hint,
      max: dim.max,
      value: scores[dim.key],
      score: Math.round((scores[dim.key] / dim.max) * 100) / 100,
    })),
    signals: [
      { label: "Useful prompts", labelZh: "有效提示", value: String(useful) },
      { label: "Sources", labelZh: "数据源", value: String(summary.source_count ?? 0) },
      {
        label: "Top category",
        labelZh: "主类别",
        value: topCategory ? String(topCategory[0]) : "—",
      },
    ],
    ...roast,
  };
}

module.exports = {
  DIMENSIONS,
  TIERS,
  ARCHETYPES,
  scoreFromCategories,
  totalScore,
  tierFor,
  dominantArchetype,
  buildRoast,
  buildVibeProfile,
};
