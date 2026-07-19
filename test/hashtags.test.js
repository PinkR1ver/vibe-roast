const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildHashtags } = require("../src/lib/hashtags");

test("buildHashtags derives #tags from archetype and categories", () => {
  const tags = buildHashtags(
    {
      archetype: { title: "Prompt Priest", code: "SPELL", hook: "Rules scroll" },
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
