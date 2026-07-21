const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("roast i18n resolves Chinese and English labels with fallback", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "i18n.js")));

  assert.equal(mod.t("app.profileView", "en"), "Roast Result");
  assert.equal(mod.t("app.profileView", "zh"), "Roast 结果");
  assert.equal(mod.t("profile.cloud", "zh"), "词云");
  assert.equal(mod.t("missing.key", "zh"), "missing.key");
});
