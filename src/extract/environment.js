const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

async function inspectEnvironment({ home = os.homedir(), codexHome } = {}) {
  const resolvedCodexHome = codexHome || process.env.CODEX_HOME || path.join(home, ".codex");
  const [skills, config, customInstructions] = await Promise.all([
    inspectSkills(resolvedCodexHome),
    inspectCodexConfig(path.join(resolvedCodexHome, "config.toml")),
    inspectCustomInstructions(path.join(resolvedCodexHome, "AGENTS.md")),
  ]);

  return {
    codex: {
      home: resolvedCodexHome,
      skills,
      mcp_servers: config.mcp_servers,
      plugins: config.plugins,
      config: config.config,
      custom_instructions: customInstructions,
      system_prompt: customInstructions,
    },
  };
}

async function inspectSkills(codexHome) {
  const userFiles = await walkFiles(path.join(codexHome, "skills"), (filePath) =>
    filePath.endsWith("SKILL.md"),
  );
  const pluginFiles = await walkFiles(path.join(codexHome, "plugins", "cache"), (filePath) =>
    /[/\\]skills[/\\][^/\\]+[/\\]SKILL\.md$/.test(filePath),
  );
  const userNames = await skillNames(userFiles);
  const pluginNames = await skillNames(pluginFiles);
  const names = Array.from(new Set([...userNames, ...pluginNames])).sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    count: names.length,
    user_count: userNames.length,
    plugin_count: pluginNames.length,
    names,
    user_names: userNames,
    plugin_names: pluginNames,
  };
}

async function skillNames(files) {
  const names = [];
  for (const file of files) {
    const name = (await readSkillName(file)) || path.basename(path.dirname(file));
    names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

async function inspectCodexConfig(configPath) {
  const text = await fs.readFile(configPath, "utf8").catch(() => "");
  return {
    mcp_servers: {
      count: sectionNames(text, "mcp_servers").length,
      names: sectionNames(text, "mcp_servers"),
    },
    plugins: inspectPlugins(text),
    config: {
      present: Boolean(text),
      model: scalarValue(text, "model"),
      personality: scalarValue(text, "personality"),
      sandbox_mode: scalarValue(text, "sandbox_mode"),
      approval_policy: scalarValue(text, "approval_policy"),
    },
  };
}

function inspectPlugins(text) {
  const names = sectionNames(text, "plugins");
  let enabledCount = 0;
  for (const name of names) {
    const block = sectionBlock(text, `plugins.${JSON.stringify(name)}`) || sectionBlock(text, `plugins."${name}"`);
    if (/^\s*enabled\s*=\s*true\s*$/m.test(block)) enabledCount += 1;
  }
  return { count: names.length, enabled_count: enabledCount, names };
}

async function inspectCustomInstructions(filePath) {
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  return {
    present: Boolean(text.trim()),
    path: filePath,
    char_count: text.length,
    line_count: text ? text.split(/\r?\n/).length : 0,
    preview: text.trim().slice(0, 500),
  };
}

function sectionNames(text, prefix) {
  const re = new RegExp(`^\\s*\\[${escapeRegExp(prefix)}\\.(?:"([^"]+)"|([^\\]]+))\\]\\s*$`, "gm");
  const names = [];
  let match;
  while ((match = re.exec(text))) {
    const raw = (match[1] || match[2] || "").trim();
    const name = raw.split(".")[0].replace(/^"|"$/g, "");
    if (name && !names.includes(name)) names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

function sectionBlock(text, sectionName) {
  const lines = text.split(/\r?\n/);
  const header = `[${sectionName}]`;
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) return "";
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n");
}

function scalarValue(text, key) {
  const re = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*"(.*)"\\s*$`, "m");
  const match = text.match(re);
  return match ? match[1] : null;
}

async function readSkillName(filePath) {
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  const match = text.match(/^name:\s*(.+)\s*$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

async function walkFiles(rootDir, predicate) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(filePath);
      else if (entry.isFile() && predicate(filePath)) out.push(filePath);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { inspectEnvironment };
