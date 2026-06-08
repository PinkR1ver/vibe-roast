import React, { useState } from "react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Overview from "./pages/Overview";
import PromptAnalysis from "./pages/PromptAnalysis";
import Environment from "./pages/Environment";

const PAGES = {
  overview: Overview,
  prompts: PromptAnalysis,
  environment: Environment,
};

/* ── Sidebar ─────────────────────────────────────────────── */

function Sidebar({ active, onNav, collapsed, onToggle }) {
  const { theme, cycle } = useTheme();

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 border-r border-oai-gray-200 dark:border-oai-gray-800 bg-oai-gray-50 dark:bg-oai-gray-950 shrink-0 transition-[width] duration-200 ${
        collapsed ? "w-[68px]" : "w-[220px]"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 py-3.5">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          V
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-oai-black dark:text-oai-white">
            Vibe Wrapper
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-md hover:bg-oai-gray-200 dark:hover:bg-oai-gray-800 text-oai-gray-400 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            {collapsed ? (
              <path d="M6 4l4 4-4 4" />
            ) : (
              <path d="M10 4l-4 4 4 4" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-4">
        {/* General */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-oai-gray-400">
              General
            </p>
          )}
          <div className="space-y-0.5">
            <NavItem
              icon={<GridIcon />}
              label="Overview"
              active={active === "overview"}
              collapsed={collapsed}
              onClick={() => onNav("overview")}
            />
            <NavItem
              icon={<ChatIcon />}
              label="Prompts"
              active={active === "prompts"}
              collapsed={collapsed}
              onClick={() => onNav("prompts")}
            />
            <NavItem
              icon={<GlobeIcon />}
              label="Environment"
              active={active === "environment"}
              collapsed={collapsed}
              onClick={() => onNav("environment")}
            />
          </div>
        </div>

        {/* Settings */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-oai-gray-400">
              Settings
            </p>
          )}
          <div className="space-y-0.5">
            <button
              onClick={cycle}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-oai-gray-500 hover:text-oai-black dark:hover:text-oai-white hover:bg-oai-gray-200/70 dark:hover:bg-oai-gray-800/70 transition-colors text-left"
              title={`Theme: ${theme}`}
            >
              <ThemeIconSm theme={theme} />
              {!collapsed && <span className="capitalize">{theme}</span>}
            </button>
            <a
              href="https://github.com/PinkR1ver/vibe-wrapper"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-oai-gray-500 hover:text-oai-black dark:hover:text-oai-white hover:bg-oai-gray-200/70 dark:hover:bg-oai-gray-800/70 transition-colors"
            >
              <GitHubIcon />
              {!collapsed && <span>GitHub</span>}
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, active, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
        active
          ? "bg-oai-gray-200/70 dark:bg-oai-gray-800 text-oai-black dark:text-oai-white font-medium"
          : "text-oai-gray-500 hover:text-oai-black dark:hover:text-oai-white hover:bg-oai-gray-100 dark:hover:bg-oai-gray-900"
      }`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

/* ── Icons ──────────────────────────────────────────────── */

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="8.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0">
      <path d="M3 2.5h6a2 2 0 0 1 2 2v1M3 12.5h6a2 2 0 0 0 2-2v-1M3 5.5h9M3 9.5h9" />
      <circle cx="11" cy="5" r="1.5" />
      <circle cx="11" cy="10" r="1.5" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2" />
      <path d="M4.5 1.5v12M10.5 1.5v12M1.5 5.5h12M1.5 10.5h12" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" className="shrink-0">
      <path d="M7.5.5a7 7 0 0 0-2.21 13.64c.35.06.48-.15.48-.33v-1.16c-1.97.42-2.38-.94-2.38-.94-.33-.82-.8-1.04-.8-1.04-.64-.44.05-.43.05-.43.71.05 1.09.72 1.09.72.64 1.08 1.67.77 2.07.59.06-.46.25-.77.45-.95-1.58-.18-3.24-.78-3.24-3.5 0-.77.28-1.4.73-1.9-.07-.18-.32-.9.07-1.87 0 0 .6-.19 1.95.73A6.8 6.8 0 0 1 7.5 3.9a6.8 6.8 0 0 1 1.78.24c1.35-.92 1.95-.73 1.95-.73.39.97.14 1.69.07 1.87.45.5.73 1.13.73 1.9 0 2.73-1.66 3.32-3.25 3.5.26.22.48.65.48 1.3v1.93c0 .18.13.4.49.33A7 7 0 0 0 7.5.5Z" />
    </svg>
  );
}
function ThemeIconSm({ theme }) {
  if (theme === "dark") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
        <path d="M8 1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 1Zm4.95 2.3a.75.75 0 0 1 0 1.06l-.35.35a.75.75 0 0 1-1.06-1.06l.35-.35a.75.75 0 0 1 1.06 0ZM14 8a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1 0-1.5h.5A.75.75 0 0 1 14 8Zm-1.7 4.95a.75.75 0 0 1-1.06 0l-.35-.35a.75.75 0 0 1 1.06-1.06l.35.35a.75.75 0 0 1 0 1.06ZM12 12.7a5.25 5.25 0 1 1-5.96-8.55 3.75 3.75 0 0 0 5.82 5.82A5.23 5.23 0 0 1 12 12.7Z" />
      </svg>
    );
  }
  if (theme === "system") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
        <rect x="1" y="2" width="14" height="10" rx="1.5" />
        <path d="M5 15h6M8 12v3" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
      <path d="M8 1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 1Zm0 2.25a4.75 4.75 0 1 0 0 9.5 4.75 4.75 0 0 0 0-9.5Zm0 1.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Zm4.95.55a.75.75 0 0 1 0 1.06l-.35.35a.75.75 0 0 1-1.06-1.06l.35-.35a.75.75 0 0 1 1.06 0ZM14 8a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1 0-1.5h.5A.75.75 0 0 1 14 8Zm-1.7 4.95a.75.75 0 0 1-1.06 0l-.35-.35a.75.75 0 0 1 1.06-1.06l.35.35a.75.75 0 0 1 0 1.06Z" />
    </svg>
  );
}

/* ── App Shell ─────────────────────────────────────────────── */

export default function AppShell() {
  const [active, setActive] = useState("overview");
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("vibe-sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("vibe-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const Page = PAGES[active] || Overview;

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-oai-gray-50 dark:bg-oai-gray-950">
        <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={toggleSidebar} />
        <main className="flex-1 p-6 min-w-0">
          <div className="max-w-4xl mx-auto panel p-8">
            <Page />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
