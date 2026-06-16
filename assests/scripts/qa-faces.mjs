import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const characters = [
  { file: "characters/01-builder/builder-character.svg", label: "Builder SHIP" },
  { file: "characters/02-debugger/debugger-character.svg", label: "Debugger HUNT" },
  { file: "characters/03-architect/architect-character.svg", label: "Architect DRAW" },
];

let ok = true;

for (const { file, label } of characters) {
  const full = path.join(root, file);
  const name = path.basename(file);
  const svg = fs.readFileSync(full, "utf8");

  if (!svg.includes(`aria-label="${label}`)) {
    console.error(`FAIL ${name}: missing aria-label for ${label}`);
    ok = false;
  }

  if (!svg.includes("data:image/png;base64,")) {
    console.error(`FAIL ${name}: expected embedded reference PNG (data:image/png;base64)`);
    ok = false;
  }

  if (/href=["'][^"']*\.png["']/i.test(svg) && !svg.includes("data:image/png;base64,")) {
    console.error(`FAIL ${name}: external PNG href not allowed — inline base64 only`);
    ok = false;
  }

  if (/translate\(68 12\)|headband|hood/.test(svg)) {
    console.error(`FAIL ${name}: forbidden legacy human-neck layers`);
    ok = false;
  }

  if (ok) console.log(`PASS ${name} (raster)`);
}

process.exit(ok ? 0 : 1);
