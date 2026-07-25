const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
]);
const SKIP_DIRECTORIES = new Set([".git", "dist", "node_modules"]);
const RETIRED_BRAND = new RegExp(
  `${["vibe", "wrapper"].join("(?:-|_| )")}|\\.${["vibe", "wrapper"].join("-")}`,
  "i",
);

function textFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) files.push(...textFiles(path.join(root, entry.name)));
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(path.join(root, entry.name));
  }
  return files;
}

test("npm exposes only the vibe-roast executable", () => {
  const pkg = require("../package.json");
  assert.deepEqual(pkg.bin, { "vibe-roast": "bin/vibe-roast.js" });
  assert.equal(fs.existsSync(path.join(ROOT, "bin", "vibe-roast.js")), true);
});

test("source and project context contain no retired brand identifiers", () => {
  const violations = [];
  for (const file of textFiles(ROOT)) {
    const content = fs.readFileSync(file, "utf8");
    if (RETIRED_BRAND.test(content)) violations.push(path.relative(ROOT, file));
  }
  assert.deepEqual(violations, []);
});
