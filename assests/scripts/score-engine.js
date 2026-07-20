/**
 * Coding-agent usage score engine (vibe-wrapper).
 * Six weighted axes sum to 100 — ghfind-shaped, agent-native.
 */
export const DIMENSIONS = [
  {
    key: "orchestration",
    label: "Agent orchestration",
    labelZh: "Agent 编排",
    max: 20,
    hint: "Skills · MCP · multi-agent workflow",
  },
  {
    key: "promptCraft",
    label: "Prompt craft",
    labelZh: "提示词手艺",
    max: 18,
    hint: "Useful intent vs paste dumps",
  },
  {
    key: "build",
    label: "Build throughput",
    labelZh: "构建吞吐",
    max: 18,
    hint: "Implementation & packaging density",
  },
  {
    key: "debug",
    label: "Debug resilience",
    labelZh: "调试韧性",
    max: 14,
    hint: "Breakpoint stamina & root-cause chase",
  },
  {
    key: "context",
    label: "Context discipline",
    labelZh: "上下文纪律",
    max: 16,
    hint: "Window hygiene · no log farming",
  },
  {
    key: "ship",
    label: "Ship courage",
    labelZh: "上线勇气",
    max: 14,
    hint: "Merge energy vs review paralysis",
  },
];

export const TIERS = [
  { id: "GOD", min: 88, color: "#e8a317", emoji: "🏆", blurb: "Legendary · Hall of Fame", blurbZh: "传说级 · 名人堂" },
  { id: "ELITE", min: 72, color: "#7c6cf0", emoji: "💎", blurb: "Top-tier agentic engineer", blurbZh: "顶尖 Agentic 工程选手" },
  { id: "SOLID", min: 55, color: "#2bb673", emoji: "🟢", blurb: "Reliable · ship-ready", blurbZh: "靠谱 · 能交付" },
  { id: "NPC", min: 35, color: "#8b8680", emoji: "😐", blurb: "Background cast · needs plot", blurbZh: "路人甲 · 缺主线" },
  { id: "TRASH", min: 0, color: "#e24b4b", emoji: "💩", blurb: "Low-signal · vibe-farmed", blurbZh: "低信号 · 疑似 vibe 刷分" },
];

function categoryCount(categories, name) {
  const row = categories[name];
  if (row == null) return 0;
  if (typeof row === "number") return Number.isFinite(row) ? row : 0;
  const count = Number(row.count);
  return Number.isFinite(count) ? count : 0;
}

/** Map DNA category counts → absolute axis scores (0..max). */
export function scoreFromCategories(categories = {}, env = {}) {
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
  const plugins = Number(env.plugins?.count ?? 0);

  const orchestrationRaw =
    (c("workflow") / totalUseful) * 12 + Math.min(skills, 12) * 0.35 + Math.min(mcp, 8) * 0.5 + Math.min(plugins, 6) * 0.25;
  const promptCraftRaw = usefulRatio * 14 + Math.min(c("explanation") + c("planning"), 20) * 0.2;
  const buildRaw = ((c("implementation") + c("packaging")) / totalUseful) * 18;
  const debugRaw = (c("debugging") / totalUseful) * 14;
  const contextRaw = usefulRatio * 12 + Math.max(0, 4 - reference / Math.max(totalUseful, 1) * 4);
  const shipRaw = ((c("packaging") + c("testing") * 0.4) / totalUseful) * 10 + (1 - Math.min(c("planning") / totalUseful, 0.6)) * 4;

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

export function totalScore(scores) {
  return Math.round(Object.values(scores).reduce((s, v) => s + Number(v || 0), 0) * 10) / 10;
}

export function tierFor(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

export function dominantArchetype(scores) {
  const map = [
    ["orchestration", "04-codex-believer"],
    ["promptCraft", "05-prompt-priest"],
    ["build", "01-builder"],
    ["debug", "02-debugger"],
    ["context", "07-context-maxxer"],
    ["ship", "08-yolo-shipper"],
  ];
  // Architect if plan-ish via balanced orchestration+prompt without ship
  let best = map[0];
  let bestVal = -1;
  for (const row of map) {
    const v = Number(scores[row[0]] || 0);
    if (v > bestVal) {
      bestVal = v;
      best = row;
    }
  }
  // Soft overrides for classic archetypes
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

/** Demo personas — showcase each mascot on a ghfind-like result page. */
export const DEMO_PROFILES = [
  {
    id: "demo-builder",
    handle: "shipfast_dev",
    name: "Ship Fast",
    archetype: "01-builder",
    tags: ["#DeployFirst", "#RocketLaptop", "#ProdIsQA"],
    scores: { orchestration: 11.2, promptCraft: 12.4, build: 16.8, debug: 6.1, context: 10.5, ship: 12.6 },
    signals: [
      { label: "Total tokens", value: "842" },
      { label: "Sources", value: "Codex · Cursor" },
      { label: "Top category", value: "Implementation" },
    ],
    featured: [
      { title: "feature/checkout-rewrite", meta: "128 prompts · ship streak 9d" },
      { title: "infra/preview-deploys", meta: "Packaging heavy · 0 open PRs left" },
    ],
    roast:
      "🔥 You don't write code — you launch it. The rocket on your laptop isn't a sticker, it's a warning label for your teammates' review queue. Implementation density is elite; debug axis is where the unpaid intern lives. You thank the agent for the code and merge before the thank-you finishes rendering. Keep shipping — just maybe let HUNT borrow the keyboard once a sprint.",
    roastZh:
      "🔥 你不是在写代码，你是在发射代码。笔记本上的火箭不是贴纸，是给队友 review 队列的警告标签。构建轴拉满，调试轴像欠费的实习生。你跟 Agent 道完谢，merge 按钮已经自己按完了。继续发——但请每个 sprint 至少借给 HUNT 一次键盘。",
    tldr: "Deploy-first Builder with god-tier throughput and a soft spot for skipping the autopsy.",
    tldrZh: "Deploy-first 的 Builder：吞吐封神，验尸偏软。",
  },
  {
    id: "demo-debugger",
    handle: "duck_at_3am",
    name: "Rubber Duck",
    archetype: "02-debugger",
    tags: ["#BreakpointMonk", "#DuckCounsel", "#StackTracePoet"],
    scores: { orchestration: 8.4, promptCraft: 13.1, build: 7.2, debug: 13.6, context: 12.8, ship: 5.4 },
    signals: [
      { label: "Total tokens", value: "611" },
      { label: "Sources", value: "Claude · Cursor" },
      { label: "Top category", value: "Debugging" },
    ],
    featured: [
      { title: "bug/race-in-checkout", meta: "47 debug turns · 1 root cause" },
      { title: "incident/null-on-friday", meta: "Duck approved · humans survived" },
    ],
    roast:
      "🔥 Your rubber duck has seniority. Debug resilience is maxed; ship courage is on PTO. You can recite stack frames like poetry and still refuse to merge a green CI because 'what if the flake is sentient.' The agent is your detective partner, not your deployer. Respect — now close the ticket.",
    roastZh:
      "🔥 你的小黄鸭工龄比你长。调试韧性拉满，上线勇气在休假。你能把堆栈背成诗，却因为『万一 flake 有自我意识』而不敢点 merge。Agent 是你的侦探搭档，不是发布官。致敬——然后把 ticket 关了。",
    tldr: "Night-shift Debugger: finds truth, fears the merge button.",
    tldrZh: "夜班 Debugger：真相猎手，merge 恐惧症。",
  },
  {
    id: "demo-architect",
    handle: "boxes_before_bytes",
    name: "Diagram First",
    archetype: "03-architect",
    tags: ["#BoxesFirst", "#ADRForever", "#NoCodeUntilDrawn"],
    scores: { orchestration: 14.6, promptCraft: 15.2, build: 8.1, debug: 6.4, context: 13.9, ship: 7.0 },
    signals: [
      { label: "Total tokens", value: "390" },
      { label: "Sources", value: "Codex" },
      { label: "Top category", value: "Planning" },
    ],
    featured: [
      { title: "docs/system-map-v9", meta: "More boxes than commits" },
      { title: "rfc/agent-topology", meta: "MCP graph looks like a constellation" },
    ],
    roast:
      "🔥 You draw galaxies before you type hello-world. Prompt craft and orchestration are gorgeous; build throughput is still waiting for the ink to dry on the whiteboard. The agent gets exquisite specs and occasionally some code. Beautiful mind — now ship a rectangle that runs.",
    roastZh:
      "🔥 你在敲 hello-world 之前先画星系。提示词与编排很美，构建吞吐还在等白板墨水干。Agent 收到的是精美规格书，偶尔才是代码。脑子漂亮——现在请交付一个能跑的矩形。",
    tldr: "Architect who weaponizes diagrams; bytes arrive fashionably late.",
    tldrZh: "用框图当武器的 Architect；字节总是迟到。",
  },
  {
    id: "demo-faith",
    handle: "amen_to_codex",
    name: "Disciple",
    archetype: "04-codex-believer",
    tags: ["#AgentDisciple", "#HaloTerminal", "#AmenToDiff"],
    scores: { orchestration: 18.4, promptCraft: 11.0, build: 12.5, debug: 5.2, context: 9.1, ship: 11.8 },
    signals: [
      { label: "Total tokens", value: "1.2k" },
      { label: "Sources", value: "Codex · TokenTracker" },
      { label: "Top category", value: "Workflow" },
    ],
    featured: [
      { title: ".codex/skills/*", meta: "14 skills · 6 MCP servers" },
      { title: "agents/release-priest", meta: "Prays in JSONL" },
    ],
    roast:
      "🔥 You don't use the agent — you worship it. Orchestration is cathedral-tier: skills, MCP, plugins arranged like stained glass. Review is a soft amen after the diff lands. When Codex sneezes, your repo catches a cold. Faith is powerful; skepticism is still a virtue.",
    roastZh:
      "🔥 你不是在用 Agent，你是在供奉它。编排轴已是大教堂级别：skills、MCP、插件像彩窗一样排好。Review 只是 diff 落地后的轻声阿门。Codex 一打喷嚏，仓库就感冒。信仰强大——怀疑仍是美德。",
    tldr: "Codex Believer with a halo terminal and a thin review conscience.",
    tldrZh: "戴光环的 Codex Believer，review 良知偏薄。",
  },
  {
    id: "demo-priest",
    handle: "rules_scroll",
    name: "Prompt Priest",
    archetype: "05-prompt-priest",
    tags: ["#CursorRules", "#HolyScroll", "#SystemPromptCanon"],
    scores: { orchestration: 12.8, promptCraft: 17.1, build: 6.4, debug: 7.0, context: 14.2, ship: 4.8 },
    signals: [
      { label: "Total tokens", value: "455" },
      { label: "Sources", value: "Cursor" },
      { label: "Top category", value: "Explanation" },
    ],
    featured: [
      { title: ".cursor/rules/gospel.md", meta: "12k chars of commandments" },
      { title: "prompts/release-liturgy", meta: "Few-shot as scripture" },
    ],
    roast:
      "🔥 Your system prompt has chapters. Prompt craft is near-perfect; ship courage is monastic abstinence. You can make an agent recite your coding religion, then spend three days refining the amen. The scroll is holy — the binary still needs a baptism.",
    roastZh:
      "🔥 你的 system prompt 是分章节的。提示词手艺接近满分，上线勇气像修道院禁欲。你能让 Agent 背诵你的编码教义，再花三天打磨那个『阿门』。卷轴是圣物——二进制还等着受洗。",
    tldr: "Prompt Priest: liturgy excellence, deployment fasting.",
    tldrZh: "Prompt Priest：礼仪满分，部署斋戒。",
  },
  {
    id: "demo-tabs",
    handle: "localhost_47",
    name: "Tab Storm",
    archetype: "06-tab-hoarder",
    tags: ["#PortZoo", "#47Tabs", "#WhichLocalhost"],
    scores: { orchestration: 9.5, promptCraft: 8.2, build: 11.4, debug: 8.8, context: 4.2, ship: 9.1 },
    signals: [
      { label: "Total tokens", value: "703" },
      { label: "Sources", value: "Cursor · Claude" },
      { label: "Top category", value: "Implementation" },
    ],
    featured: [
      { title: ":3000 :8000 :5173 :4173", meta: "All claim to be 'the app'" },
      { title: "tabs/untitled-38", meta: "Context window crying" },
    ],
    roast:
      "🔥 Context discipline collapsed into a port zoo. You run four localhosts and ask the agent which one is real. Build still happens — somehow — between tab switches. Your browser memory is the real senior engineer. Close twenty tabs; keep the one that compiles.",
    roastZh:
      "🔥 上下文纪律塌成了端口动物园。你同时开四个 localhost，还问 Agent 哪个是真的。构建仍在发生——奇迹般地——夹在切 tab 之间。浏览器内存才是真正的高级工程师。关掉二十个标签；留下能编译的那个。",
    tldr: "Tab Hoarder: ships while the dock overflows.",
    tldrZh: "Tab Hoarder：码头溢出来也能交付。",
  },
  {
    id: "demo-meter",
    handle: "ctx_99pct",
    name: "Gauge Panic",
    archetype: "07-context-maxxer",
    tags: ["#99Percent", "#CreditAnxiety", "#OneMoreFile"],
    scores: { orchestration: 13.2, promptCraft: 14.8, build: 9.6, debug: 7.5, context: 15.4, ship: 6.2 },
    signals: [
      { label: "Total tokens", value: "528" },
      { label: "Sources", value: "Codex · Claude" },
      { label: "Top category", value: "Research" },
    ],
    featured: [
      { title: "context/pack-everything.md", meta: "Gauge stuck at 99%" },
      { title: "budget/tokens-left-12", meta: "Anxiety as a workflow" },
    ],
    roast:
      "🔥 You treat the context window like a final exam booklet — fill every margin. Discipline score is ironically high because you know exactly how close you are to blowing the meter. The agent gets exquisite compression; you get credit anxiety. Maxxing is a sport; leave 1% for oxygen.",
    roastZh:
      "🔥 你把上下文窗口当成期末试卷——边缘全写满。纪律分反而很高，因为你精确知道离爆表还有多远。Agent 得到极致压缩，你得到余额焦虑。Maxxing 是运动——请给氧气留 1%。",
    tldr: "Context Maxxer living at 99% with a calm spreadsheet heart.",
    tldrZh: "Context Maxxer：仪表盘 99%，内心是表格。",
  },
  {
    id: "demo-yolo",
    handle: "merge_without_eyes",
    name: "Red Button",
    archetype: "08-yolo-shipper",
    tags: ["#YoloFlag", "#SkipReview", "#FridayDeploy"],
    scores: { orchestration: 10.1, promptCraft: 7.4, build: 13.9, debug: 3.2, context: 6.8, ship: 13.5 },
    signals: [
      { label: "Total tokens", value: "966" },
      { label: "Sources", value: "Cursor --yolo" },
      { label: "Top category", value: "Packaging" },
    ],
    featured: [
      { title: "main ← agent/yolo-*", meta: "CI optional · vibes required" },
      { title: "hotfix/whoops", meta: "Follow-up PR titled 'sorry'" },
    ],
    roast:
      "🔥 Ship courage ate the rest of the chart. You run the agent with --yolo like it's a personality trait. Debug resilience is a missing person report. Production is your staging environment and Friday is your favorite day. Iconic — terrifying — effective until it isn't.",
    roastZh:
      "🔥 上线勇气把其余维度吃干抹净。你开着 --yolo 跑 Agent，像在展示人设。调试韧性已失踪。生产即预发，周五是节日。传奇——可怕——有效，直到某天不再有效。",
    tldr: "YOLO Shipper: merge first, invent tests in the apology PR.",
    tldrZh: "YOLO Shipper：先 merge，在道歉 PR 里补测试。",
  },
];

export const ARCHETYPES = {
  "01-builder": {
    folder: "01-builder",
    name: "builder",
    title: "Builder",
    code: "SHIP",
    accent: "#23d6a5",
    hook: "Deploy first",
  },
  "02-debugger": {
    folder: "02-debugger",
    name: "debugger",
    title: "Debugger",
    code: "HUNT",
    accent: "#ff6b9d",
    hook: "Duck at midnight",
  },
  "03-architect": {
    folder: "03-architect",
    name: "architect",
    title: "Architect",
    code: "DRAW",
    accent: "#5b8cff",
    hook: "Boxes before bytes",
  },
  "04-codex-believer": {
    folder: "04-codex-believer",
    name: "codex-believer",
    title: "Codex Believer",
    code: "FAITH",
    accent: "#a78bfa",
    hook: "Agent disciple",
  },
  "05-prompt-priest": {
    folder: "05-prompt-priest",
    name: "prompt-priest",
    title: "Prompt Priest",
    code: "SPELL",
    accent: "#f0c14a",
    hook: "Rules scroll",
  },
  "06-tab-hoarder": {
    folder: "06-tab-hoarder",
    name: "tab-hoarder",
    title: "Tab Hoarder",
    code: "TABS",
    accent: "#ff8a3d",
    hook: "47 localhost tabs",
  },
  "07-context-maxxer": {
    folder: "07-context-maxxer",
    name: "context-maxxer",
    title: "Context Maxxer",
    code: "METER",
    accent: "#22d3ee",
    hook: "Gauge at 99%",
  },
  "08-yolo-shipper": {
    folder: "08-yolo-shipper",
    name: "yolo-shipper",
    title: "YOLO Shipper",
    code: "YOLO",
    accent: "#f04343",
    hook: "Skip review merge",
  },
};
