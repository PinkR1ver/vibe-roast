/**
 * Embed banner PNGs as self-contained SVGs (1:1 pixel match, no crop).
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
    console.error(`Missing ${pngPath} — run: python scripts/compose-banners.py`);
    process.exit(1);
  }
  const { w, h } = pngSize(pngPath);
  const b64 = pngBase64(pngPath);
  const outPath = path.join(root, banner.out);

  if (w !== banner.width || h !== banner.height) {
    console.warn(
      `warn ${path.basename(pngPath)} is ${w}x${h}, expected ${banner.width}x${banner.height}`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" fill="none" aria-label="${banner.label}">
  <image width="${w}" height="${h}" href="data:image/png;base64,${b64}"/>
</svg>
`;
  fs.writeFileSync(outPath, svg);
  console.log("banner", outPath, `(${w}x${h})`);
}
