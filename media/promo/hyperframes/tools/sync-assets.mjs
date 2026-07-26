import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(projectRoot, "../../..");
const canonicalCharacters = join(repoRoot, "assests", "characters-vibe-types");
const generatedAssets = join(projectRoot, "assets");

async function copy(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

const folders = await readdir(canonicalCharacters, { withFileTypes: true });
for (const folder of folders.filter((entry) => entry.isDirectory())) {
  const folderPath = join(canonicalCharacters, folder.name);
  const files = await readdir(folderPath);
  for (const filename of files.filter((name) => name.endsWith("-figure.png"))) {
    await copy(join(folderPath, filename), join(generatedAssets, filename));
  }
}

await copy(
  join(repoRoot, "assests", "screenshots", "roast-result-hero.jpg"),
  join(generatedAssets, "roast-result-hero.jpg"),
);
await copy(
  join(repoRoot, "assests", "readme", "vibe-roast-16-types-banner.webp"),
  join(generatedAssets, "vibe-roast-16-types-banner.webp"),
);
await copy(
  join(repoRoot, "assests", "source", "fonts", "GreatVibes-Regular.ttf"),
  join(generatedAssets, "brand", "GreatVibes-Regular.ttf"),
);

console.log("Synced canonical promo assets from assests/.");
