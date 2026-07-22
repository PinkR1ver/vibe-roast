/**
 * @deprecated Use sync-raster.mjs — vector inlining cannot match reference PNG pixels.
 * Kept for history; regenerates from hand SVG if ever needed.
 */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const pairs = [
  { folder: "01-builder", code: "SHIP", glow: "rgba(35,214,165,0.18)", tag: "#cfeee6" },
  { folder: "02-debugger", code: "HUNT", glow: "rgba(255,101,150,0.14)", tag: "#f5d0dc" },
  { folder: "03-architect", code: "DRAW", glow: "rgba(92,141,255,0.16)", tag: "#d4e2ff" },
];

for (const { folder, code, glow, tag } of pairs) {
  const name = folder.split("-")[1];
  const id = folder.split("-")[0];
  const charPath = path.join(root, "characters", folder, `${name}-character.svg`);
  const cardPath = path.join(root, "characters", folder, `${name}-card.svg`);
  const char = fs.readFileSync(charPath, "utf8");
  const inner = char.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  const card = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 420" fill="none" aria-label="${name} Vibe card">
  <defs>
    <linearGradient id="cardBg" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#182230"/>
      <stop offset="100%" stop-color="#0d1219"/>
    </linearGradient>
    <radialGradient id="cardGlow" cx="50%" cy="18%" r="38%">
      <stop offset="0%" stop-color="${glow}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="310" height="420" rx="8" fill="url(#cardBg)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <rect width="310" height="420" rx="8" fill="url(#cardGlow)"/>
  <g transform="translate(18 18)">
    <rect width="72" height="26" rx="13" fill="rgba(17,24,33,0.55)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="36" y="17" text-anchor="middle" fill="${tag}" font-family="Inter,Segoe UI,sans-serif" font-size="11" font-weight="800" letter-spacing="0.08em">VIBE-${id}</text>
  </g>
  <g transform="translate(50 72)">
${inner.trim().split("\n").map((l) => "    " + l).join("\n")}
  </g>
  <text x="292" y="396" text-anchor="end" fill="#ffc34d" font-family="Inter,Segoe UI,sans-serif" font-size="36" font-weight="900">${code}</text>
</svg>
`;
  fs.writeFileSync(cardPath, card);
  console.log("synced", cardPath);
}
