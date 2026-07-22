/**
 * Coding-agent usage score engine (Node/CJS).
 * Axes mirror assests/scripts/score-engine.js — six weighted dims sum to 100.
 */

const DIMENSIONS = [
  { key: "orchestration", label: "Agent orchestration", labelZh: "Agent 编排", max: 20, hint: "Skills · MCP · multi-agent workflow", hintZh: "Skills · MCP · 多智能体工作流" },
  { key: "promptCraft", label: "Prompt craft", labelZh: "提示词手艺", max: 18, hint: "Useful intent vs paste dumps", hintZh: "有效意图 vs 粘贴倾倒" },
  { key: "build", label: "Build throughput", labelZh: "构建吞吐", max: 18, hint: "Implementation & packaging density", hintZh: "实现与打包密度" },
  { key: "debug", label: "Debug resilience", labelZh: "调试韧性", max: 14, hint: "Breakpoint stamina & root-cause chase", hintZh: "断点耐力与根因追踪" },
  { key: "context", label: "Context discipline", labelZh: "上下文纪律", max: 16, hint: "Window hygiene · no log farming", hintZh: "窗口卫生 · 不刷日志" },
  { key: "ship", label: "Ship courage", labelZh: "上线勇气", max: 14, hint: "Merge energy vs review paralysis", hintZh: "合并动能 vs review 瘫痪" },
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
    en: `🔥 You don't write code — you launch it. Build throughput is {build}/18 while debug sits at {debug}/14, which is less a skill gap and more a lifestyle: the agent ships, you mash merge, and the postmortem calendar remains a mythological document.

Rocket stickers on the laptop aren't décor; they're a warning label for the review queue. Implementation density is elite, packaging instincts are sharp, and "works on my preview URL" is somehow still your definition of done. Teammates get PRs that feel like meteor strikes — impressive, sudden, and slightly radioactive.

Keep the rocket. Just loan HUNT the keyboard once a sprint, read one failing test like literature, and pretend staging exists for reasons other than vibes.`,
    zh: `🔥 你不是在写代码，你是在发射代码。构建 {build}/18，调试只有 {debug}/14——这不太像能力差，更像人生哲学：Agent 交付，你按 merge，复盘日历仍是神话文献。

笔记本上的火箭不是贴纸，是给队友 review 队列的警告标签。实现密度封神，打包直觉很准，而「我的 preview URL 能跑」居然还是你对 Done 的定义。同事收到的 PR 像陨石——壮观、突然、略带辐射。

火箭留下。但请每个 sprint 借给 HUNT 一次键盘，把一条失败测试当文学读完，并假装预发环境的存在不只是为了 vibe。`,
    tldr: "Deploy-first Builder: elite throughput, soft autopsy habit.",
    tldrZh: "Deploy-first Builder：吞吐封神，验尸偏软。",
  },
  "02-debugger": {
    en: `🔥 Your rubber duck has seniority. Debug resilience is {debug}/14; ship courage is {ship}/14 on indefinite PTO. You recite stack frames like poetry, name races after Greek tragedies, and still refuse a green CI because the flake might be sentient.

The agent is your detective partner, not your deployer. Every "quick look" becomes an archaeological dig through logs, bisects, and three alternate theories that somehow all implicate timezones. Respect the craft — the incident channel already has.

Close the ticket. Merge the green. Let production experience one boring Tuesday without a midnight duck sermon.`,
    zh: `🔥 你的小黄鸭工龄比你长。调试 {debug}/14，上线勇气 {ship}/14 在无限期休假。堆栈能背成诗，竞态能用希腊悲剧命名，绿 CI 仍不敢点——因为 flake 可能有自我意识。

Agent 是你的侦探搭档，不是发布官。每次「看一眼」都会变成日志考古、bisect 巡礼，外加三种全都怪时区的平行宇宙理论。致敬手艺——事故频道已经听够了。

把 ticket 关了。绿了就 merge。让生产体验一个没有午夜小黄鸭布道的无聊周二。`,
    tldr: "Night-shift Debugger: finds truth, fears the merge button.",
    tldrZh: "夜班 Debugger：真相猎手，merge 恐惧症。",
  },
  "03-architect": {
    en: `🔥 Boxes before bytes. Prompt craft {promptCraft}/18 and orchestration {orchestration}/20 look gorgeous; build {build}/18 is still waiting for the whiteboard ink to dry. You can diagram a multi-agent constellation before hello-world finishes compiling.

The agent receives exquisite specs, ADRs with footnotes, and the occasional rectangle that almost runs. Stakeholders clap for the topology; CI waits for a commit that isn't named "wip-boxes-final-v9". Beautiful mind — fashionably late bytes.

Ship a rectangle that runs. Then draw the next galaxy on top of something users can click.`,
    zh: `🔥 先画框再写码。提示词 {promptCraft}/18、编排 {orchestration}/20 很美；构建 {build}/18 还在等白板墨水干。你能在 hello-world 编完之前画完多智能体星座图。

Agent 收到的是精美规格、带脚注的 ADR，偶尔才是一个几乎能跑的矩形。干系人给拓扑鼓掌；CI 还在等一个不叫「wip-boxes-final-v9」的提交。脑子漂亮——字节总是迟到。

请交付一个能跑的矩形。然后再在用户点得动的东西上面画下一座星系。`,
    tldr: "Architect who weaponizes diagrams; bytes arrive late.",
    tldrZh: "用框图当武器的 Architect；字节总是迟到。",
  },
  "04-codex-believer": {
    en: `🔥 You don't use the agent — you worship it. Orchestration {orchestration}/20 is cathedral-tier: skills, MCP, plugins arranged like stained glass. When Codex sneezes, your repo catches a cold, and the liturgy is a JSONL that never sleeps.

Review is a soft amen after the diff lands. Skepticism exists as a sticker on your water bottle, not as a blocking check. Faith scales beautifully until the halo blinds the changelog.

Keep the cathedral. Install one heretic ritual: read the diff like a non-believer before you chant merge.`,
    zh: `🔥 你不是在用 Agent，你是在供奉它。编排 {orchestration}/20 已是大教堂级别：skills、MCP、插件像彩窗一样排好。Codex 一打喷嚏，仓库就感冒；礼拜仪式是永不休眠的 JSONL。

Review 只是 diff 落地后的轻声阿门。怀疑精神贴在水杯贴纸上，从不出现在 blocking check 里。信仰很能扩展——直到光环把 changelog 照瞎。

大教堂留下。请安装一条异端仪式：chant merge 之前，先用无信仰者的眼睛把 diff 读完。`,
    tldr: "Codex Believer with a halo terminal and a thin review conscience.",
    tldrZh: "戴光环的 Codex Believer，review 良知偏薄。",
  },
  "05-prompt-priest": {
    en: `🔥 Your system prompt has chapters, footnotes, and a dress code. Prompt craft {promptCraft}/18 is near-perfect; ship {ship}/14 is monastic abstinence. You can make an agent recite your coding religion, then spend three days polishing the amen until it scans in iambic pentameter.

Rules files grow like scripture. Few-shots become canon. The scroll is holy, the liturgy is airtight, and the binary still waits outside the temple for a baptism that somehow never makes the sprint board.

Bless the prompt. Then deploy something that users can sin against in production — preferably before the next rewrite of section 4.2.`,
    zh: `🔥 你的 system prompt 分章节、有脚注，还有着装规范。提示词 {promptCraft}/18 接近满分，上线 {ship}/14 像修道院禁欲。你能让 Agent 背诵编码教义，再花三天把「阿门」打磨成抑扬格五音步。

规则文件像经文疯长。Few-shot 升级成正典。卷轴是圣物，礼仪滴水不漏，二进制还在庙门外等受洗——而这场洗礼永远挤不进 sprint 看板。

请祝福提示词。然后部署一点用户能在生产环境里犯罪的东西——最好赶在下一轮重写第 4.2 节之前。`,
    tldr: "Prompt Priest: liturgy excellence, deployment fasting.",
    tldrZh: "Prompt Priest：礼仪满分，部署斋戒。",
  },
  "06-tab-hoarder": {
    en: `🔥 Context discipline collapsed to {context}/16 — a port zoo with opinions. You run four localhosts and ask the agent which one is real, while untitled tabs multiply like rabbits with sourcemaps.

Build still happens — somehow — between tab switches. Browser memory is the real senior engineer; your dock is a crime scene. The agent answers carefully because it has seen this episode before.

Close twenty tabs. Keep the one that compiles. Name it something other than "final-final-v3".`,
    zh: `🔥 上下文纪律塌到 {context}/16——一座很有主见的端口动物园。四个 localhost 同时活着，你还问 Agent 哪个是真的；未命名标签像带 sourcemap 的兔子一样繁殖。

构建仍在发生——奇迹般地——夹在切 tab 之间。浏览器内存才是真正的高级工程师；程序坞是案发现场。Agent 回答得很谨慎，因为它看过这一集。

关掉二十个标签。留下能编译的那个。别再叫它「final-final-v3」。`,
    tldr: "Tab Hoarder: ships while the dock overflows.",
    tldrZh: "Tab Hoarder：码头溢出来也能交付。",
  },
  "07-context-maxxer": {
    en: `🔥 You treat the context window like a final exam booklet — fill every margin. Context {context}/16 is ironically high because you know exactly how close you are to blowing the meter, down to the last courtesy token.

The agent gets exquisite compression: ranked files, ruthless summaries, anxiety as a workflow. You get credit panic and the spiritual high of "one more file." Maxxing is a sport; oxygen is still undefeated.

Leave 1% for breath. The model will survive. Your pulse might too.`,
    zh: `🔥 你把上下文窗口当成期末试卷——边缘全写满。纪律 {context}/16 反而很高，因为你精确知道离爆表还有多远，精确到最后一个礼貌 token。

Agent 得到极致压缩：文件排序、无情摘要、把焦虑当工作流。你得到的是余额恐慌，外加「再塞一个文件」的精神高潮。Maxxing 是运动；氧气至今保持不败。

请给呼吸留 1%。模型会活下来。你的脉搏或许也会。`,
    tldr: "Context Maxxer living at 99% with a spreadsheet heart.",
    tldrZh: "Context Maxxer：仪表盘 99%，内心是表格。",
  },
  "08-yolo-shipper": {
    en: `🔥 Ship courage {ship}/14 ate the chart. Debug {debug}/14 is a missing person report. You run the agent with --yolo like it's a personality trait, and Friday remains your favorite liturgical day.

Production is staging. Review is optional lore. The follow-up PR is titled "sorry" and somehow still merges faster than the apology lands in Slack. Iconic until the pager learns your government name.

Keep the courage. Invent tests before the apology PR — or at least in the same commit as the regret.`,
    zh: `🔥 上线勇气 {ship}/14 吃干了图表。调试 {debug}/14 已失踪。你开着 --yolo 跑 Agent，像在展示人设；周五仍是你最爱的礼拜日。

生产即预发。Review 是可选传说。后续 PR 标题叫「sorry」，合并速度仍快过道歉出现在 Slack。传奇——直到 pager 学会你的身份证名。

勇气留下。请在道歉 PR 之前发明测试——或者至少跟悔恨放进同一个 commit。`,
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

const { buildActivitySignals } = require("./activity-metrics");

function buildVibeProfile({ categories = {}, env = {}, summary = {}, promptAnalysis = {}, activity = {} } = {}) {
  const scores = scoreFromCategories(categories, env);
  const total = totalScore(scores);
  const tier = tierFor(total);
  const archetypeId = dominantArchetype(scores);
  const archetype = ARCHETYPES[archetypeId];
  const roast = buildRoast(archetypeId, scores);

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
      hintZh: dim.hintZh,
      max: dim.max,
      value: scores[dim.key],
      score: Math.round((scores[dim.key] / dim.max) * 100) / 100,
    })),
    signals: buildActivitySignals({ activity, summary, categories }),
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
