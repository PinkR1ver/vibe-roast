/** Generate a portrait 3:4 editorial share card via canvas. */

const INK = "#171717";
const PAPER = "#f4f0e8";
const PAPER_LIGHT = "#fffaf2";
const MUTED = "#706a63";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function colorWithAlpha(color, alpha) {
  const hex = String(color || "").replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const value = Number.parseInt(hex, 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  return color;
}

function mixWithPaper(color, amount = 0.8) {
  const hex = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return PAPER;
  const value = Number.parseInt(hex, 16);
  const source = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const paper = [244, 240, 232];
  const mixed = source.map((channel, index) => Math.round(channel * (1 - amount) + paper[index] * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function splitText(ctx, text, maxWidth) {
  const value = String(text || "").trim();
  if (!value) return [];
  const isMostlyCjk = (value.match(/[\u3400-\u9fff]/g) || []).length > value.length * 0.2;
  const units = isMostlyCjk ? [...value] : value.split(/\s+/);
  const separator = isMostlyCjk ? "" : " ";
  const lines = [];
  let line = "";
  for (const unit of units) {
    const candidate = line ? `${line}${separator}${unit}` : unit;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = unit;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = splitText(ctx, text, maxWidth);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    visible[visible.length - 1] = `${last}…`;
  }
  visible.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return visible.length;
}

function fittedFont(ctx, text, { maxWidth, start, min, family, weight = 800 }) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > min);
  return min;
}

function selectedAxis(axis = {}) {
  if (axis.letter === axis.left?.code) return axis.left;
  if (axis.letter === axis.right?.code) return axis.right;
  return { code: axis.letter || "?", label: axis.label, labelZh: axis.labelZh, percent: 50 };
}

function pickPosterQuote(vibe, zh) {
  const roast = zh ? (vibe?.roastZh || vibe?.roast) : (vibe?.roast || vibe?.roastZh);
  const fallback = zh ? (vibe?.tldrZh || vibe?.tldr) : (vibe?.tldr || vibe?.tldrZh);
  const clean = String(roast || fallback || "")
    .replace(/^🔥\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = clean.match(/[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/g) || [];
  return sentences.slice(0, 2).join(zh ? "" : " ").trim() || fallback || "";
}

function drawAxisIndex(ctx, axes, accent, zh) {
  const rows = (axes || []).slice(0, 4);
  if (!rows.length) return;
  const startX = 62;
  const top = 1214;
  const gap = 18;
  const width = (1080 - startX * 2 - gap * 3) / 4;

  ctx.strokeStyle = "rgba(23,23,23,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, top - 26);
  ctx.lineTo(1080 - startX, top - 26);
  ctx.stroke();

  rows.forEach((axis, index) => {
    const chosen = selectedAxis(axis);
    const x = startX + index * (width + gap);
    const label = (zh ? chosen.labelZh : chosen.label) || chosen.label || "";

    if (index > 0) {
      ctx.strokeStyle = "rgba(23,23,23,0.14)";
      ctx.beginPath();
      ctx.moveTo(x - gap / 2, top);
      ctx.lineTo(x - gap / 2, top + 82);
      ctx.stroke();
    }

    ctx.textAlign = "left";
    ctx.fillStyle = accent;
    ctx.font = "900 34px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(chosen.code || axis.letter || "?", x, top + 34);

    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = "700 14px Outfit, system-ui, sans-serif";
    ctx.fillText(`${Number(chosen.percent || 0)}%`, x + width, top + 30);

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = "700 16px Outfit, system-ui, sans-serif";
    drawWrappedText(ctx, label, x, top + 64, width, 18, 2);
  });
}

function hashtagLayout(ctx, hashtags, fontSize, maxWidth) {
  ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
  const rowHeight = fontSize + 18;
  const items = [];
  let x = 58;
  let y = 370;
  for (const tag of hashtags) {
    const width = Math.ceil(ctx.measureText(tag).width) + 28;
    if (x > 58 && x + width > 58 + maxWidth) {
      x = 58;
      y += rowHeight + 8;
    }
    items.push({ tag, x, y, width, height: rowHeight });
    x += width + 8;
  }
  return { items, bottom: items.length ? y + rowHeight : 370 };
}

function drawHashtags(ctx, hashtags, accent) {
  const complete = (hashtags || []).filter(Boolean);
  if (!complete.length) return;
  let fontSize = 18;
  let layout = hashtagLayout(ctx, complete, fontSize, 442);
  while (layout.bottom > 596 && fontSize > 13) {
    fontSize -= 1;
    layout = hashtagLayout(ctx, complete, fontSize, 442);
  }

  layout.items.forEach((item, index) => {
    ctx.fillStyle = index === 0 ? accent : colorWithAlpha(accent, 0.09);
    ctx.strokeStyle = index === 0 ? accent : colorWithAlpha(accent, 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(item.x, item.y, item.width, item.height, item.height / 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = index === 0 ? "#ffffff" : INK;
    ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
    ctx.fillText(item.tag, item.x + 14, item.y + fontSize + 7);
  });
}

function drawFooter(ctx, zh) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 1334, 1080, 106);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "800 12px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "测测你的编码人格" : "ROAST YOUR CODING VIBE", 58, 1367);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Outfit, system-ui, sans-serif";
  ctx.fillText("github.com/PinkR1ver/vibe-roast", 58, 1402);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "800 12px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "本地运行 · 开源" : "RUN LOCAL · OPEN SOURCE", 1022, 1367);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("npx vibe-roast", 1022, 1402);
}

/**
 * @param {object} opts
 * @param {object} opts.vibe
 * @param {string[]} opts.hashtags
 * @param {"en"|"zh"} [opts.locale]
 * @param {number} [opts.width]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderSharePoster({ vibe, hashtags = [], locale = "en", width = 1080 } = {}) {
  const zh = locale === "zh";
  const height = Math.round((width * 4) / 3);
  const scale = width / 1080;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  if (document.fonts?.ready) await document.fonts.ready;

  const accent = vibe?.archetype?.accent || "#ff5a1f";
  const typeCode = vibe?.type_code || vibe?.archetype?.code || "????";
  const title = (zh ? vibe?.archetype?.titleZh : vibe?.archetype?.title) || "Vibe Coder";
  const hook = (zh ? vibe?.archetype?.hookZh : vibe?.archetype?.hook) || "";
  const quote = pickPosterQuote(vibe, zh) || hook;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1440);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, 1080, 96);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px Outfit, system-ui, sans-serif";
  ctx.fillText("VIBE ROASTER", 58, 59);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "700 15px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "编码人格档案" : "CODING PERSONALITY FILE", 1022, 57);

  ctx.fillStyle = mixWithPaper(accent, 0.78);
  ctx.fillRect(0, 96, 1080, 704);

  ctx.fillStyle = colorWithAlpha(accent, 0.18);
  ctx.beginPath();
  ctx.arc(900, 270, 270, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = "900 190px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(typeCode, 36, 412);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = "800 15px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "你的类型" : "YOUR TYPE", 58, 158);

  fittedFont(ctx, title, {
    maxWidth: 470,
    start: zh ? 68 : 76,
    min: 48,
    family: "Outfit, system-ui, sans-serif",
    weight: 900,
  });
  ctx.fillStyle = INK;
  ctx.fillText(title, 58, 226);

  ctx.fillStyle = MUTED;
  ctx.font = `700 ${zh ? 24 : 22}px Outfit, system-ui, sans-serif`;
  drawWrappedText(ctx, hook, 58, 274, 430, 31, 3);
  drawHashtags(ctx, hashtags, accent);

  try {
    let image;
    try {
      image = await loadImage(vibe.figure);
    } catch (error) {
      if (!vibe.figure_fallback) throw error;
      image = await loadImage(vibe.figure_fallback);
    }
    const maxWidth = 620;
    const maxHeight = 660;
    const imageScale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const imageWidth = image.width * imageScale;
    const imageHeight = image.height * imageScale;
    const imageX = 1080 - imageWidth - 36;
    const imageY = 118 + (maxHeight - imageHeight);
    ctx.save();
    ctx.shadowColor = "rgba(35,25,18,0.14)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    ctx.restore();
  } catch {
    // The typography remains a complete fallback when a local figure is absent.
  }

  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "900 120px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(typeCode, 52, 752);

  ctx.fillStyle = accent;
  ctx.fillRect(58, 842, 7, 302);
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = "900 15px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "ROAST 摘要" : "THE ROAST", 88, 874);

  ctx.fillStyle = INK;
  ctx.font = `800 ${zh ? 42 : 39}px Outfit, system-ui, sans-serif`;
  drawWrappedText(ctx, quote, 88, 932, 910, zh ? 57 : 53, 5);

  drawAxisIndex(ctx, vibe?.type_axes || [], accent, zh);
  drawFooter(ctx, zh);

  return canvas;
}

export function downloadCanvasPng(canvas, filename = "vibe-roast-card.png") {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

export function canvasToPngFile(canvas, filename = "vibe-roast-card.png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create the share image."));
        return;
      }
      resolve(new File([blob], filename, { type: "image/png" }));
    }, "image/png");
  });
}
