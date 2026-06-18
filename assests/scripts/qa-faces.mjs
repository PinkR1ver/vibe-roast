import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "profiles.json"), "utf8")
);

const profiles = config.boards.flatMap((b) => b.profiles);
let ok = true;

for (const profile of profiles) {
  const char = path.join(
    root,
    "characters",
    profile.folder,
    `${profile.name}-character.svg`
  );
  const card = path.join(
    root,
    "characters",
    profile.folder,
    `${profile.name}-card.svg`
  );
  const badge = path.join(
    root,
    "badges",
    profile.folder,
    `${profile.name}-badge.svg`
  );

  for (const [label, file] of [
    ["character", char],
    ["card", card],
    ["badge", badge],
  ]) {
    const name = path.basename(file);
    if (!fs.existsSync(file)) {
      console.error(`FAIL missing ${file}`);
      ok = false;
      continue;
    }
    const svg = fs.readFileSync(file, "utf8");
    if (!svg.includes("data:image/png;base64,")) {
      console.error(`FAIL ${name}: expected embedded PNG`);
      ok = false;
    } else {
      console.log(`PASS ${name}`);
    }
  }
}

for (const banner of config.banners) {
  const file = path.join(root, banner.out);
  const name = path.basename(file);
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${file}`);
    ok = false;
    continue;
  }
  const svg = fs.readFileSync(file, "utf8");
  if (!svg.includes("data:image/png;base64,")) {
    console.error(`FAIL ${name}: expected embedded PNG`);
    ok = false;
  } else {
    console.log(`PASS ${name}`);
  }
}

process.exit(ok ? 0 : 1);
