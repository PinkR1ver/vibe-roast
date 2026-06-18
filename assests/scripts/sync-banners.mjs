/**
 * Embed banner PNGs as self-contained SVGs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "profiles.json"), "utf8")
);

function pngBase64(filePath) {
  return fs.readFileSync(filePath).toString("base64");
}

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

for (const banner of config.banners) {
  const pngPath = path.join(root, banner.file);
  if (!fs.existsSync(pngPath)) {
    console.error(`Missing ${pngPath}`);
    process.exit(1);
  }
  const { w, h } = pngSize(pngPath);
  const b64 = pngBase64(pngPath);
  const outPath = path.join(root, banner.out);
  const targetW = banner.width;
  const targetH = banner.height;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${targetW} ${targetH}" fill="none" aria-label="${banner.label}">
  <rect width="${targetW}" height="${targetH}" fill="#0a0a0f"/>
  <image x="0" y="0" width="${targetW}" height="${targetH}" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(outPath, svg);
  console.log("banner", outPath, `(source ${w}x${h} → viewBox ${targetW}x${targetH})`);
}
