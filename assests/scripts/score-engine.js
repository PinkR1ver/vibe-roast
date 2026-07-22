/** Browser-side reference for src/lib/agent-score.js. Keep formulas aligned. */
export const DIMENSIONS = [
  ["orchestration", "Agent orchestration", "Agent 编排", "Workflow delegation density", "工作流与委派密度"],
  ["promptCraft", "Prompt craft", "提示词手艺", "Intent clarity vs pasted noise", "清晰意图 vs 粘贴噪音"],
  ["build", "Build drive", "构建驱动力", "Implementation and packaging", "实现与打包倾向"],
  ["debug", "Verification drive", "验证驱动力", "Debug, tests, and refactors", "调试、测试与重构"],
  ["context", "Context appetite", "上下文胃口", "Long prompts and reference payloads", "长提示与引用负载"],
  ["ship", "Shipping bias", "交付倾向", "Execution over deliberation", "执行相对思考的倾向"],
].map(([key, label, labelZh, hint, hintZh]) => ({ key, label, labelZh, hint, hintZh, max: 100 }));

const AXES = [
  ["maker_architect", ["M", "Maker", "造物派"], ["A", "Architect", "架构派"]],
  ["orchestrator_promptsmith", ["O", "Orchestrator", "编排派"], ["P", "Promptsmith", "提示派"]],
  ["verifier_shipper", ["V", "Verifier", "验证派"], ["S", "Shipper", "交付派"]],
  ["focused_maxcontext", ["F", "Focused", "聚焦派"], ["X", "Max-context", "满上下文派"]],
].map(([key, left, right]) => ({ key, left, right }));

function count(categories, name) {
  const row = categories?.[name];
  const value = typeof row === "number" ? row : Number(row?.count || 0);
  return Number.isFinite(value) ? value : 0;
}

function ratioScore(n, d) { return d > 0 ? Math.round(Math.min(1, Math.max(0, n / d)) * 1000) / 10 : 0; }

export function scoreFromCategories(categories = {}, _env = {}, promptAnalysis = {}) {
  const c = (name) => count(categories, name);
  const useful = ["implementation", "debugging", "planning", "research", "ui_design", "explanation", "testing", "refactor", "packaging", "workflow"].reduce((sum, key) => sum + c(key), 0);
  if (!useful) return Object.fromEntries(DIMENSIONS.map((dim) => [dim.key, 0]));
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

function split(def, leftEvidence, rightEvidence) {
  const total = leftEvidence + rightEvidence;
  const lp = total ? Math.round(leftEvidence / total * 100) : 50;
  const rp = 100 - lp;
  const chosen = lp >= rp ? def.left : def.right;
  return { key: def.key, letter: chosen[0], label: chosen[1], labelZh: chosen[2], left: { code: def.left[0], label: def.left[1], labelZh: def.left[2], percent: lp }, right: { code: def.right[0], label: def.right[1], labelZh: def.right[2], percent: rp }, margin: Math.abs(lp - rp) };
}

export function classifyType(categories = {}, promptAnalysis = {}) {
  const c = (name) => count(categories, name);
  const usefulRatio = Number(promptAnalysis.useful_ratio ?? 1);
  const longRatio = Number(promptAnalysis.long_prompt_ratio || 0);
  const referenceRatio = Math.max(0, 1 - usefulRatio);
  const axes = [
    split(AXES[0], c("implementation") + c("packaging") + c("testing") + c("refactor") + c("debugging") + c("ui_design") * 0.5, c("planning") + c("research") + c("explanation") + c("ui_design") * 0.5),
    split(AXES[1], c("workflow") * 2 + c("planning") * 0.2, c("implementation") * 0.2 + c("explanation") + c("ui_design") * 0.35 + 0.25),
    split(AXES[2], c("debugging") + c("testing") + c("refactor") * 0.7, c("implementation") + c("packaging") + c("ui_design") * 0.25),
    split(AXES[3], Math.max(0.05, 1 - longRatio - referenceRatio), longRatio * 1.4 + referenceRatio * 1.2),
  ];
  return { code: axes.map((axis) => axis.letter).join(""), axes };
}
