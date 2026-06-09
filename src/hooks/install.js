const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const HOOK_SCRIPT = path.join(__dirname, "..", "..", "bin", "hook.js");

async function install({ home = os.homedir() } = {}) {
  const results = {};

  // --- Claude Code ---
  const claudeSettingsPath = path.join(home, ".claude", "settings.json");
  try {
    const result = await installClaudeHook(claudeSettingsPath);
    results.claude = result;
  } catch (err) {
    results.claude = { installed: false, error: err.message };
  }

  // --- Codex ---
  const codexConfigPath = path.join(home, ".codex", "config.toml");
  try {
    const result = await installCodexHook(codexConfigPath);
    results.codex = result;
  } catch (err) {
    results.codex = { installed: false, error: err.message };
  }

  return results;
}

async function uninstall({ home = os.homedir() } = {}) {
  const results = {};

  const claudeSettingsPath = path.join(home, ".claude", "settings.json");
  try {
    const result = await removeClaudeHook(claudeSettingsPath);
    results.claude = result;
  } catch (err) {
    results.claude = { removed: false, error: err.message };
  }

  const codexConfigPath = path.join(home, ".codex", "config.toml");
  try {
    const result = await removeCodexHook(codexConfigPath);
    results.codex = result;
  } catch (err) {
    results.codex = { removed: false, error: err.message };
  }

  return results;
}

/* ── Claude Code ─────────────────────────────────────── */

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function installClaudeHook(settingsPath) {
  const cmd = `/usr/bin/env node ${HOOK_SCRIPT} --source=claude`;
  const settings = await readJson(settingsPath);

  const hooks = settings.hooks || {};
  const sessionEnd = Array.isArray(hooks.SessionEnd) ? [...hooks.SessionEnd] : [];

  // Check if already installed
  for (const entry of sessionEnd) {
    const subHooks = entry?.hooks || (entry?.command ? [entry] : []);
    for (const h of subHooks) {
      if (h?.command === cmd) {
        return { installed: false, reason: "already-configured" };
      }
    }
  }

  // Add hook
  sessionEnd.push({ hooks: [{ type: "command", command: cmd }] });

  const newSettings = { ...settings, hooks: { ...hooks, SessionEnd: sessionEnd } };

  // Backup
  try {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath + ".vibe-backup", JSON.stringify(settings, null, 2));
  } catch {}

  await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
  return { installed: true, path: settingsPath };
}

async function removeClaudeHook(settingsPath) {
  const cmd = `/usr/bin/env node ${HOOK_SCRIPT} --source=claude`;
  const settings = await readJson(settingsPath);
  if (!settings.hooks?.SessionEnd) return { removed: false, reason: "no-hooks" };

  const sessionEnd = settings.hooks.SessionEnd.filter((entry) => {
    const subHooks = entry?.hooks || (entry?.command ? [entry] : []);
    return !subHooks.some((h) => h?.command === cmd);
  });

  if (sessionEnd.length === settings.hooks.SessionEnd.length) {
    return { removed: false, reason: "hook-not-found" };
  }

  const newHooks = { ...settings.hooks, SessionEnd: sessionEnd };
  if (sessionEnd.length === 0) delete newHooks.SessionEnd;
  const newSettings = { ...settings, hooks: newHooks };
  if (Object.keys(newSettings.hooks).length === 0) delete newSettings.hooks;

  await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
  return { removed: true, path: settingsPath };
}

/* ── Codex ─────────────────────────────────────────────── */

const CODEX_HOOK_TOML = `
# Vibe Wrapper — token tracking hook
[[notify.hooks]]
event = "session_end"
command = "node ${HOOK_SCRIPT}"
`.trim() + "\n";

async function installCodexHook(configPath) {
  try {
    const existing = await fs.readFile(configPath, "utf8");
    if (existing.includes(HOOK_SCRIPT)) {
      return { installed: false, reason: "already-configured" };
    }

    // Backup
    try { await fs.writeFile(configPath + ".vibe-backup", existing); } catch {}

    await fs.appendFile(configPath, "\n" + CODEX_HOOK_TOML.replace("${HOOK_SCRIPT}", HOOK_SCRIPT));
    return { installed: true, path: configPath };
  } catch {
    // No config.toml — create minimal one
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, CODEX_HOOK_TOML.replace("${HOOK_SCRIPT}", HOOK_SCRIPT));
    return { installed: true, path: configPath, reason: "created-new-config" };
  }
}

async function removeCodexHook(configPath) {
  try {
    const existing = await fs.readFile(configPath, "utf8");
    if (!existing.includes(HOOK_SCRIPT)) {
      return { removed: false, reason: "hook-not-found" };
    }

    const lines = existing.split("\n").filter((line) => !line.includes(HOOK_SCRIPT));
    // Also remove the Vibe Wrapper comment and empty [[notify.hooks]] blocks
    const cleaned = cleanCodexConfig(lines);

    await fs.writeFile(configPath, cleaned);
    return { removed: true, path: configPath };
  } catch {
    return { removed: false, reason: "config-missing" };
  }
}

function cleanCodexConfig(lines) {
  const out = [];
  let skip = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip Vibe Wrapper comment and associated hook entries
    if (line.includes("# Vibe Wrapper")) {
      skip = true;
      continue;
    }
    if (skip && (line.trim().startsWith("[") || line.trim() === "")) {
      skip = false;
    }
    if (!skip) out.push(line);
  }
  return out.join("\n").trim() + "\n";
}

module.exports = { install, uninstall };
