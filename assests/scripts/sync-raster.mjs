/**
 * Embed mascot PNG slices + badge crops as self-contained SVGs.
 * Reads scripts/profiles.json — run after split-reference.py
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "profiles.json"), "utf8")
);

const CARD_W = 310;
const CARD_H = 420;
const CARD_BG = "#0a0a0f";
const BADGE_SIZE = 64;

function pngBase64(filePath) {
  return fs.readFileSync(filePath).toString("base64");
}

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function writeCharacter(profile, pngPath, w, h) {
  const b64 = pngBase64(pngPath);
  const out = path.join(
    root,
    "characters",
    profile.folder,
    `${profile.name}-character.svg`
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" fill="none" aria-label="${profile.label} (raster)">
  <image width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log("character", out);
}

function writeCard(profile, pngPath, w, h) {
  const b64 = pngBase64(pngPath);
  const scale = Math.min((CARD_W - 20) / w, CARD_H / h);
  const imgW = Math.round(w * scale);
  const imgH = Math.round(h * scale);
  const x = Math.round((CARD_W - imgW) / 2);
  const y = Math.round((CARD_H - imgH) / 2);
  const out = path.join(
    root,
    "characters",
    profile.folder,
    `${profile.name}-card.svg`
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${CARD_W} ${CARD_H}" fill="none" aria-label="${profile.name} Vibe card (raster)">
  <rect width="${CARD_W}" height="${CARD_H}" rx="8" fill="${CARD_BG}"/>
  <image x="${x}" y="${y}" width="${imgW}" height="${imgH}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>
  <text x="292" y="396" text-anchor="end" fill="#ffc34d" font-family="Inter,Segoe UI,sans-serif" font-size="28" font-weight="900">${profile.code}</text>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log("card", out);
}

function writeBadge(profile, pngPath) {
  const b64 = pngBase64(pngPath);
  const out = path.join(
    root,
    "badges",
    profile.folder,
    `${profile.name}-badge.svg`
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${BADGE_SIZE} ${BADGE_SIZE}" fill="none" aria-label="${profile.label} badge">
  <rect width="${BADGE_SIZE}" height="${BADGE_SIZE}" rx="14" fill="#111821"/>
  <image x="4" y="4" width="56" height="56" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log("badge", out);
}

const profiles = config.boards.flatMap((b) => b.profiles);

for (const profile of profiles) {
  const mascotPath = path.join(
    root,
    "characters",
    profile.folder,
    `${profile.name}-mascot.png`
  );
  const badgePath = path.join(
    root,
    "badges",
    profile.folder,
    `${profile.name}-badge.png`
  );

  if (!fs.existsSync(mascotPath)) {
    console.error(`Missing ${mascotPath} — run: python scripts/split-reference.py`);
    process.exit(1);
  }

  const { w, h } = pngSize(mascotPath);
  writeCharacter(profile, mascotPath, w, h);
  writeCard(profile, mascotPath, w, h);

  if (fs.existsSync(badgePath)) {
    writeBadge(profile, badgePath);
  } else {
    console.warn("skip badge (no png):", badgePath);
  }
}
