/** Shared helpers for static roast pages (live-report / result). */

export const CODE_TAGS = {
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

export function buildHashtags(vibe, categories = {}, limit = 8) {
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
  return tags.slice(0, limit);
}

export function renderWordCloud(canvas, words, accent = "#ff5a1f") {
  if (!canvas || !words?.length) return;
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 220;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const max = words[0]?.count || 1;
  const palette = [accent, "#c45c26", "#f0c14a", "#23d6a5", "#5b8cff", "#6b6560", "#d97706"];
  const placed = [];
  const shuffled = words.slice(0, 40);

  function collides(x, y, w, h) {
    for (const box of placed) {
      if (x < box.x + box.w + 4 && x + w + 4 > box.x && y < box.y + box.h + 2 && y + h + 2 > box.y) return true;
    }
    return false;
  }

  for (let i = 0; i < shuffled.length; i++) {
    const { term, count } = shuffled[i];
    const weight = count / max;
    const size = 11 + weight * 28;
    ctx.font = `700 ${size}px Outfit, system-ui, sans-serif`;
    const tw = ctx.measureText(term).width;
    const th = size;
    let placedOk = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const angle = attempt * 0.55;
      const radius = 4 + attempt * 3.2;
      const x = width / 2 + Math.cos(angle) * radius * 1.35 - tw / 2;
      const y = height / 2 + Math.sin(angle) * radius * 0.85 + th / 3;
      if (x < 4 || y < th || x + tw > width - 4 || y > height - 4) continue;
      if (collides(x, y - th, tw, th)) continue;
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.55 + weight * 0.45;
      ctx.fillText(term, x, y);
      placed.push({ x, y: y - th, w: tw, h: th });
      placedOk = true;
      break;
    }
    if (!placedOk) {
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.5;
      ctx.fillText(term, 8 + (i % 5) * (width / 5), 20 + Math.floor(i / 5) * 22);
    }
  }
  ctx.globalAlpha = 1;
}

function rotatePoint(x, y, z, yaw, pitch) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY - y * sinY;
  const y1 = x * sinY + y * cosY;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  return { x: x1, y: y1 * cosP - z * sinP, z: y1 * sinP + z * cosP };
}

function shadeColor(hex, factor) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const c = (n) => Math.max(0, Math.min(255, Math.round(n * factor)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

function buildWeeksFromDaily(dailyRows = [], weeks = 20) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1));
  const startDow = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - startDow);

  const byDay = new Map();
  for (const row of dailyRows) {
    if (!row?.day) continue;
    byDay.set(row.day, Number(row.value || row.billable_total_tokens || row.total_tokens || 0));
  }

  const values = [];
  const cells = [];
  const totalDays = Math.floor((end - start) / 86400000) + 1;
  const weekCount = Math.ceil(totalDays / 7);
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setUTCDate(dt.getUTCDate() + w * 7 + d);
      if (dt > end) {
        week.push(null);
        continue;
      }
      const day = dt.toISOString().slice(0, 10);
      const value = byDay.get(day) || 0;
      if (value > 0) values.push(value);
      week.push({ day, value });
    }
    cells.push(week);
  }
  values.sort((a, b) => a - b);
  const q = (pct) => {
    if (!values.length) return 0;
    const pos = (values.length - 1) * pct;
    const lo = Math.floor(pos);
    const hi = Math.min(values.length - 1, lo + 1);
    return Math.round(values[lo] + (values[hi] - values[lo]) * (pos - lo));
  };
  const t1 = q(0.5);
  const t2 = q(0.75);
  const t3 = q(0.9);
  for (const week of cells) {
    for (const cell of week) {
      if (!cell) continue;
      if (!cell.value) cell.level = 0;
      else if (cell.value <= t1) cell.level = 1;
      else if (cell.value <= t2) cell.level = 2;
      else if (cell.value <= t3) cell.level = 3;
      else cell.level = 4;
    }
  }
  return cells.length > weeks ? cells.slice(cells.length - weeks) : cells;
}

const EMERALD = ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];

function compactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(Math.round(n));
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n < 10000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${(n / 1000000000).toFixed(2)}B`;
}

export function renderActivityIso(container, activity, weeks = 52) {
  if (!container) return;
  const dailyRows = activity?.daily_rows || [];
  const weeksData = buildWeeksFromDaily(dailyRows, weeks);
  const yaw = -0.2;
  const pitch = 0.88;
  const UNIT = 11;
  const GAP = 1.6;
  const SIZE = UNIT - GAP;
  const HEIGHT_MAX = 30;
  const isTokens = activity?.metric === "tokens" && Number(activity?.total_tokens || 0) > 0;

  const cells = [];
  weeksData.forEach((week, wi) => {
    (week || []).forEach((cell, di) => {
      if (!cell) return;
      cells.push({ col: wi, row: di, level: cell.level || 0, value: cell.value, day: cell.day });
    });
  });

  if (!cells.length) {
    container.innerHTML = `<p class="sub" style="margin:0;text-align:center">No activity days in snapshot</p>`;
    return;
  }

  const W = weeksData.length;
  const projected = cells.map((c) => {
    const h = Math.max(1.8, (c.level / 4) * HEIGHT_MAX);
    const xc = (c.col - W / 2) * UNIT;
    const yc = (c.row - 3.5) * UNIT;
    const half = SIZE / 2;
    const pts = [
      { x: xc - half, y: yc - half, z: 0 },
      { x: xc + half, y: yc - half, z: 0 },
      { x: xc + half, y: yc + half, z: 0 },
      { x: xc - half, y: yc + half, z: 0 },
      { x: xc - half, y: yc - half, z: h },
      { x: xc + half, y: yc - half, z: h },
      { x: xc + half, y: yc + half, z: h },
      { x: xc - half, y: yc + half, z: h },
    ].map((p) => rotatePoint(p.x, p.y, p.z, yaw, pitch));
    const center = rotatePoint(xc, yc, h / 2, yaw, pitch);
    const base = EMERALD[Math.min(4, c.level)];
    const faces = [
      { indices: [4, 5, 6, 7], scale: 1 },
      { indices: [1, 2, 6, 5], scale: 0.75 },
      { indices: [0, 1, 5, 4], scale: 0.85 },
      { indices: [3, 0, 4, 7], scale: 0.55 },
    ];
    const paths = faces.map((f) => {
      const [a, b, c2, d] = f.indices.map((i) => pts[i]);
      return `<path d="M${a.x},${a.y} L${b.x},${b.y} L${c2.x},${c2.y} L${d.x},${d.y} Z" fill="${shadeColor(base, f.scale)}" stroke="rgba(16,185,129,0.08)" stroke-width="0.4" />`;
    });
    return { center, paths: paths.join(""), z: center.z };
  });

  projected.sort((a, b) => a.z - b.z);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of projected) {
    minX = Math.min(minX, p.center.x - UNIT * 2);
    maxX = Math.max(maxX, p.center.x + UNIT * 2);
    minY = Math.min(minY, p.center.y - UNIT * 2);
    maxY = Math.max(maxY, p.center.y + UNIT * 2);
  }
  const pad = 16;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  const peak = activity?.peak_day;
  const kpi = `
    <div class="activity-kpi">
      <div><span>${isTokens ? "Total tokens" : "Active days"}</span><strong>${isTokens ? compactNumber(activity.total_tokens) : (activity.active_day_count || dailyRows.length)}</strong></div>
      <div><span>Streak</span><strong>${activity.longest_streak || 0}d</strong></div>
      <div><span>Peak</span><strong>${peak?.value ? compactNumber(peak.value) : "—"}</strong></div>
      <div><span>Provider</span><strong>${(activity.top_provider || "—").toString().toUpperCase()}</strong></div>
    </div>`;
  container.innerHTML = `${kpi}<svg viewBox="${vb}" role="img" aria-label="3D activity" style="width:100%;height:260px">${projected.map((p) => p.paths).join("")}</svg>`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function downloadSharePoster({ vibe, hashtags = [], lang = "zh" }) {
  const width = 900;
  const height = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const accent = vibe?.archetype?.accent || "#ff5a1f";
  const pad = 48;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#fff7f0");
  grad.addColorStop(0.5, "#f3f1ec");
  grad.addColorStop(1, "#e8e4db");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 22px Outfit, system-ui, sans-serif";
  ctx.fillText("vibe-wrapper", pad, pad + 8);
  ctx.fillStyle = "#6b6560";
  ctx.font = "600 16px Outfit, system-ui, sans-serif";
  ctx.fillText(lang === "zh" ? "竖屏分享海报 · 3:4" : "Share poster · 3:4", pad, pad + 32);

  let figureY = pad + 56;
  try {
    const img = await loadImage(vibe.figure);
    const maxW = width * 0.58;
    const maxH = height * 0.4;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    ctx.drawImage(img, (width - iw) / 2, figureY, iw, ih);
    figureY += ih + 18;
  } catch {
    figureY += 280;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "800 42px Outfit, system-ui, sans-serif";
  ctx.fillText(vibe.archetype?.title || "Vibe", width / 2, figureY);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 56px 'JetBrains Mono', monospace";
  ctx.fillText(Number(vibe.total).toFixed(1), width / 2, figureY + 64);
  ctx.fillStyle = "#6b6560";
  ctx.font = "600 20px Outfit, system-ui, sans-serif";
  ctx.fillText("/ 100", width / 2, figureY + 92);

  ctx.fillStyle = vibe.tier?.color || accent;
  ctx.font = "800 28px Outfit, system-ui, sans-serif";
  ctx.fillText(`${vibe.tier?.emoji || ""} ${vibe.tier?.id || ""}`.trim(), width / 2, figureY + 132);

  ctx.font = "700 18px Outfit, system-ui, sans-serif";
  let tagX = pad;
  let tagY = figureY + 168;
  for (const tag of hashtags.slice(0, 6)) {
    const tw = ctx.measureText(tag).width + 24;
    if (tagX + tw > width - pad) {
      tagX = pad;
      tagY += 36;
    }
    roundRect(ctx, tagX, tagY - 22, tw, 30, 15);
    ctx.fillStyle = `${accent}22`;
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.textAlign = "left";
    ctx.fillText(tag, tagX + 12, tagY);
    tagX += tw + 10;
  }

  const tldr = lang === "zh" ? vibe.tldrZh || vibe.tldr : vibe.tldr || vibe.tldrZh;
  roundRect(ctx, pad, height - 220, width - pad * 2, 150, 20);
  ctx.fillStyle = "#fffcf7";
  ctx.fill();
  ctx.fillStyle = "#6b6560";
  ctx.font = "800 13px Outfit, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TL;DR", pad + 24, height - 180);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "600 18px Outfit, system-ui, sans-serif";
  const max = 46;
  let rest = String(tldr || "");
  let ly = height - 150;
  for (let i = 0; i < 3 && rest; i++) {
    ctx.fillText(rest.slice(0, max), pad + 24, ly);
    rest = rest.slice(max);
    ly += 28;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8b8680";
  ctx.font = "600 13px Outfit, system-ui, sans-serif";
  ctx.fillText("vibe-wrapper · local roast", width / 2, height - 28);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `vibe-roast-${(vibe.archetype?.code || "vibe").toLowerCase()}-3x4.png`;
  a.click();
}
