/** Generate a portrait 3:4 share poster PNG via canvas. */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
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

function drawMiniRadar(ctx, dimensions, accent, cx, cy, radius) {
  const n = dimensions.length || 6;
  const rings = [0.33, 0.66, 1];
  ctx.save();
  ctx.strokeStyle = "rgba(40,30,20,0.12)";
  ctx.lineWidth = 1.5;
  for (const ring of rings) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
      const x = cx + Math.cos(angle) * radius * ring;
      const y = cy + Math.sin(angle) * radius * ring;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const dim = dimensions[i];
    const ratio = Math.min(1, Number(dim.score || dim.value / dim.max || 0));
    const r = 8 + ratio * (radius - 8);
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = `${accent}44`;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {object} opts
 * @param {object} opts.vibe
 * @param {string[]} opts.hashtags
 * @param {"en"|"zh"} [opts.locale]
 * @param {number} [opts.width]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderSharePoster({ vibe, hashtags = [], locale = "en", width = 900 } = {}) {
  const zh = locale === "zh";
  const height = Math.round((width * 4) / 3);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const accent = vibe?.archetype?.accent || "#ff5a1f";
  const pad = 48;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#fff7f0");
  grad.addColorStop(0.45, "#f3f1ec");
  grad.addColorStop(1, "#e8e4db");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const blob = ctx.createRadialGradient(width * 0.2, height * 0.15, 20, width * 0.2, height * 0.15, width * 0.45);
  blob.addColorStop(0, `${accent}33`);
  blob.addColorStop(1, "transparent");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 22px Outfit, system-ui, sans-serif";
  ctx.fillText("Vibe Roaster", pad, pad + 8);
  ctx.fillStyle = "#6b6560";
  ctx.font = "600 16px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "分享海报 · 3:4" : "Share poster · 3:4", pad, pad + 32);

  let figureY = pad + 56;
  try {
    const img = await loadImage(vibe.figure);
    const maxW = width * 0.58;
    const maxH = height * 0.42;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = (width - iw) / 2;
    ctx.drawImage(img, ix, figureY, iw, ih);
    figureY += ih + 18;
  } catch {
    figureY += height * 0.28;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "800 42px Outfit, system-ui, sans-serif";
  ctx.fillText(vibe?.archetype?.title || "Vibe", width / 2, figureY);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 56px 'JetBrains Mono', ui-monospace, monospace";
  const score = Number(vibe?.total || 0).toFixed(1);
  ctx.fillText(`${score}`, width / 2, figureY + 64);
  ctx.fillStyle = "#6b6560";
  ctx.font = "600 20px Outfit, system-ui, sans-serif";
  ctx.fillText("/ 100", width / 2, figureY + 92);

  const tier = vibe?.tier || {};
  ctx.fillStyle = tier.color || accent;
  ctx.font = "800 28px Outfit, system-ui, sans-serif";
  ctx.fillText(`${tier.emoji || ""} ${tier.id || ""}`.trim(), width / 2, figureY + 132);

  const tags = (hashtags || []).slice(0, 6);
  ctx.font = "700 18px Outfit, system-ui, sans-serif";
  let tagX = pad;
  let tagY = figureY + 168;
  const tagGap = 10;
  for (const tag of tags) {
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
    tagX += tw + tagGap;
  }

  const cardW = width - pad * 2;
  const cardH = 200;
  const cardY = height - pad - cardH - 36;
  roundRect(ctx, pad, cardY, cardW, cardH, 22);
  ctx.fillStyle = "#fffcf7";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#6b6560";
  ctx.font = "800 14px Outfit, system-ui, sans-serif";
  ctx.fillText(zh ? "分数雷达" : "SCORE RADAR", pad + 24, cardY + 28);

  drawMiniRadar(ctx, vibe?.dimensions || [], accent, pad + cardW * 0.28, cardY + cardH / 2 + 8, 62);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "600 15px Outfit, system-ui, sans-serif";
  const tldr = zh ? (vibe?.tldrZh || vibe?.tldr || "") : (vibe?.tldr || vibe?.tldrZh || "");
  const maxChars = zh ? 28 : 42;
  const lines = [];
  let rest = tldr;
  while (rest.length && lines.length < 3) {
    lines.push(rest.slice(0, maxChars));
    rest = rest.slice(maxChars);
  }
  let ly = cardY + 56;
  for (const line of lines) {
    ctx.fillText(line, pad + cardW * 0.52, ly);
    ly += 24;
  }

  ctx.fillStyle = "#8b8680";
  ctx.font = "600 13px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(zh ? "vibe-wrapper · 本地 roast" : "vibe-wrapper · local roast", width / 2, height - 22);

  return canvas;
}

export function downloadCanvasPng(canvas, filename = "vibe-roast-poster.png") {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
