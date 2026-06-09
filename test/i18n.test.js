const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("dashboard i18n resolves Chinese and English labels with fallback", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "i18n.js")));

  assert.equal(mod.t("dashboard.profile.kicker", "en"), "Your Vibe Profile");
  assert.equal(mod.t("dashboard.profile.kicker", "zh"), "你的 Vibe 画像");
  assert.equal(mod.t("dashboard.stats.prompts", "zh"), "提示");
  assert.equal(mod.t("missing.key", "zh"), "missing.key");
});
