const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildHashtags } = require("../src/lib/hashtags");

test("buildHashtags derives #tags from archetype and categories", () => {
  const tags = buildHashtags(
    {
      archetype: { id: "05-prompt-priest", title: "Prompt Priest", code: "SPELL", hook: "Rules scroll" },
      tier: { id: "NPC" },
    },
    {
      implementation: { count: 199 },
      testing: { count: 29 },
      debugging: { count: 22 },
    },
  );
  assert.ok(tags.includes("#PromptPriest"));
  assert.ok(tags.includes("#SpellCraft"));
  assert.ok(tags.includes("#NPC"));
  assert.ok(tags.includes("#Implementation"));
  assert.ok(tags.every((t) => t.startsWith("#")));
});

test("buildHashtags switches to Chinese tags with locale zh", () => {
  const tags = buildHashtags(
    {
      archetype: {
        id: "05-prompt-priest",
        title: "Prompt Priest",
        code: "SPELL",
        hook: "Rules scroll",
        hookZh: "规则卷轴",
      },
      tier: { id: "NPC" },
    },
    {
      implementation: { count: 199 },
      testing: { count: 29 },
    },
    { locale: "zh" },
  );
  assert.ok(tags.includes("#提示祭司"));
  assert.ok(tags.includes("#法术工艺"));
  assert.ok(tags.includes("#路人甲"));
  assert.ok(tags.includes("#实现"));
  assert.ok(tags.includes("#规则卷轴") || tags.includes("#规则"));
  assert.ok(tags.every((t) => t.startsWith("#")));
});
