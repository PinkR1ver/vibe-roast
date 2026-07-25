import React from "react";

const AGENTS = {
  cursor: { label: "Cursor", glyph: "cursor", color: "#ffffff", background: "#171717" },
  codex: { label: "Codex", glyph: "codex", color: "#ffffff", background: "#111827" },
  claude: { label: "Claude Code", glyph: "claude", color: "#fff8f0", background: "#d97757" },
  gemini: { label: "Gemini CLI", glyph: "gemini", color: "#ffffff", background: "#4285f4" },
  copilot: { label: "GitHub Copilot", glyph: "copilot", color: "#ffffff", background: "#24292f" },
  antigravity: { label: "Antigravity", glyph: "antigravity", color: "#ffffff", background: "#1769ff" },
  cline: { label: "Cline", mark: "C", color: "#ffffff", background: "#2563eb" },
  roo: { label: "Roo Code", mark: "R", color: "#ffffff", background: "#ea580c" },
  continue: { label: "Continue", mark: "▶", color: "#ffffff", background: "#7c3aed" },
  aider: { label: "Aider", mark: "A", color: "#ffffff", background: "#15803d" },
  windsurf: { label: "Windsurf", mark: "≋", color: "#062a2e", background: "#5eead4" },
  amazonq: { label: "Amazon Q", mark: "Q", color: "#ffffff", background: "#ff9900" },
  opencode: { label: "OpenCode", glyph: "code", color: "#ffffff", background: "#334155" },
};

export function normalizeAgentId(agent) {
  const key = String(agent || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  const aliases = {
    "claude-code": "claude",
    "github-copilot": "copilot",
    "amazon-q": "amazonq",
    "gemini-cli": "gemini",
    "roo-code": "roo",
  };
  return aliases[key] || key;
}

export function agentLabel(agent) {
  const id = normalizeAgentId(agent);
  return AGENTS[id]?.label || String(agent || "Agent");
}

function AgentGlyph({ glyph, mark }) {
  if (!glyph) return mark;
  const common = {
    width: "72%",
    height: "72%",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  if (glyph === "cursor") {
    return (
      <svg {...common}>
        <path d="M5.5 3.5 19 12l-6.1 1.35 3.25 5.7-2.6 1.45-3.2-5.7L6 19Z" fill="currentColor" />
      </svg>
    );
  }
  if (glyph === "codex") {
    return (
      <svg {...common}>
        <path d="M12 3.2 16 5.5l4 6.5-4 6.5-4 2.3-4-2.3L4 12l4-6.5Z" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }
  if (glyph === "claude") {
    return (
      <svg {...common}>
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4M7.2 3.9l9.6 16.2M20.1 7.2 3.9 16.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (glyph === "gemini") {
    return (
      <svg {...common}>
        <path d="M12 2.8c.5 5.55 3.65 8.7 9.2 9.2-5.55.5-8.7 3.65-9.2 9.2-.5-5.55-3.65-8.7-9.2-9.2 5.55-.5 8.7-3.65 9.2-9.2Z" fill="currentColor" />
      </svg>
    );
  }
  if (glyph === "copilot") {
    return (
      <svg {...common}>
        <path d="M5 10.5 7.2 6h9.6l2.2 4.5v6L16 19H8l-3-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="9" cy="12" r="1.25" fill="currentColor" />
        <circle cx="15" cy="12" r="1.25" fill="currentColor" />
      </svg>
    );
  }
  if (glyph === "antigravity") {
    return (
      <svg {...common}>
        <path d="M5 17 17 5M9 5h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8v9h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
      </svg>
    );
  }
  if (glyph === "code") {
    return (
      <svg {...common}>
        <path d="m9 5-4 7 4 7M15 5l4 7-4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return mark;
}

export default function AgentIcon({ agent, size = 22, className = "" }) {
  const id = normalizeAgentId(agent);
  const meta = AGENTS[id] || {
    label: agentLabel(agent),
    mark: String(id || "?").slice(0, 1).toUpperCase(),
    color: "#ffffff",
    background: "#6b7280",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[28%] font-black leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] ${className}`}
      style={{
        width: size,
        height: size,
        color: meta.color,
        background: meta.background,
        fontSize: Math.max(9, Math.round(size * 0.48)),
      }}
      role="img"
      aria-label={meta.label}
      title={meta.label}
    >
      <AgentGlyph glyph={meta.glyph} mark={meta.mark} />
    </span>
  );
}
