/**
 * Embed reference PNG slices as base64 inside self-contained SVGs.
 * Pixel match with source/references/vibe-mascots-v4-reference.png — no hand-traced vectors.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const pairs = [
  {
    folder: "01-builder",
    name: "builder",
    code: "SHIP",
    label: "Builder SHIP — rocket mascot (raster)",
  },
  {
    folder: "02-debugger",
    name: "debugger",
    code: "HUNT",
    label: "Debugger HUNT — duck mascot (raster)",
  },
  {
    folder: "03-architect",
    name: "architect",
    code: "DRAW",
    label: "Architect DRAW — blueprint bot (raster)",
  },
];

function pngBase64(filePath) {
  return fs.readFileSync(filePath).toString("base64");
}

function writeCharacter({ folder, name, label }, pngPath, w, h) {
  const b64 = pngBase64(pngPath);
  const out = path.join(root, "characters", folder, `${name}-character.svg`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" fill="none" aria-label="${label}">
  <image width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log("character", out);
}

function writeCard({ folder, name, code, label }, pngPath, w, h) {
  const b64 = pngBase64(pngPath);
  const cardW = 310;
  const cardH = 420;
  const scale = Math.min((cardW - 20) / w, cardH / h);
  const imgW = Math.round(w * scale);
  const imgH = Math.round(h * scale);
  const x = Math.round((cardW - imgW) / 2);
  const y = Math.round((cardH - imgH) / 2);

  const out = path.join(root, "characters", folder, `${name}-card.svg`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${cardW} ${cardH}" fill="none" aria-label="${name} Vibe card (raster)">
  <!-- Card art is the reference PNG slice — identical pixels to vibe-mascots-v4-reference.png -->
  <rect width="${cardW}" height="${cardH}" rx="8" fill="#3a3a39"/>
  <image x="${x}" y="${y}" width="${imgW}" height="${imgH}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log("card", out, `(embedded ${w}x${h} → ${imgW}x${imgH})`);
}

for (const pair of pairs) {
  const pngPath = path.join(root, "characters", pair.folder, `${pair.name}-mascot.png`);
  if (!fs.existsSync(pngPath)) {
    console.error(`Missing ${pngPath} — run: python scripts/split-reference.py`);
    process.exit(1);
  }
  const buf = fs.readFileSync(pngPath);
  // PNG IHDR width/height at bytes 16-24 (big-endian)
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  writeCharacter(pair, pngPath, w, h);
  writeCard(pair, pngPath, w, h);
}
