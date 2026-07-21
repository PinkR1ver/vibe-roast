const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("roast i18n resolves Chinese and English labels with fallback", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "i18n.js")));

  assert.equal(mod.t("app.brand", "en"), "Vibe Roaster");
  assert.equal(mod.t("app.brand", "zh"), "Vibe Roaster");
  assert.equal(mod.t("profile.cloud", "zh"), "词云");
  assert.equal(mod.t("profile.posterShare", "en"), "Share poster");
  assert.equal(mod.t("profile.posterShare", "zh"), "分享海报");
  assert.equal(mod.t("profile.posterDownload", "en"), "Download PNG");
  assert.equal(mod.t("missing.key", "zh"), "missing.key");
});
