import React, { useState } from "react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Overview from "./pages/Overview";
import PromptAnalysis from "./pages/PromptAnalysis";
import Environment from "./pages/Environment";

const NAV = [
  { id: "overview", label: "Overview", icon: OverviewIcon },
  { id: "prompts", label: "Prompt Analysis", icon: PromptIcon },
  { id: "environment", label: "Environment", icon: EnvIcon },
];

const PAGES = {
  overview: Overview,
  prompts: PromptAnalysis,
  environment: Environment,
};

function Sidebar({ active, onNav, collapsed, onToggle }) {
  const { theme, cycle } = useTheme();

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 transition-all duration-200 ${
        collapsed ? "w-[72px]" : "w-[220px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          V
        </div>
        {!collapsed && <span className="text-body-sm font-semibold text-neutral-950 dark:text-neutral-50">Vibe Wrapper</span>}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            {collapsed ? (
              <path d="M6 4l4 4-4 4" />
            ) : (
              <path d="M10 4l-4 4 4 4" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm transition-colors ${
              active === item.id
                ? "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 font-medium"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <item.icon />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={cycle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon theme={theme} />
          {!collapsed && <span className="capitalize">{theme}</span>}
        </button>
      </div>
    </aside>
  );
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 1Zm4.95 2.3a.75.75 0 0 1 0 1.06l-.35.35a.75.75 0 0 1-1.06-1.06l.35-.35a.75.75 0 0 1 1.06 0ZM14 8a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1 0-1.5h.5A.75.75 0 0 1 14 8Zm-1.7 4.95a.75.75 0 0 1-1.06 0l-.35-.35a.75.75 0 0 1 1.06-1.06l.35.35a.75.75 0 0 1 0 1.06ZM12 12.7a5.25 5.25 0 1 1-5.96-8.55 3.75 3.75 0 0 0 5.82 5.82A5.23 5.23 0 0 1 12 12.7Z" />
      </svg>
    );
  }
  if (theme === "system") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="14" height="10" rx="1.5" />
        <path d="M5 15h6M8 12v3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 1Zm0 2.25a4.75 4.75 0 1 0 0 9.5 4.75 4.75 0 0 0 0-9.5Zm0 1.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Zm4.95.55a.75.75 0 0 1 0 1.06l-.35.35a.75.75 0 0 1-1.06-1.06l.35-.35a.75.75 0 0 1 1.06 0ZM14 8a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1 0-1.5h.5A.75.75 0 0 1 14 8Zm-1.7 4.95a.75.75 0 0 1-1.06 0l-.35-.35a.75.75 0 0 1 1.06-1.06l.35.35a.75.75 0 0 1 0 1.06Z" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="8.5" width="5" height="5" rx="1" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function PromptIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3 2.5h6a2 2 0 0 1 2 2v1M3 12.5h6a2 2 0 0 0 2-2v-1M3 5.5h9M3 9.5h9" />
      <circle cx="11" cy="5" r="1.5" />
      <circle cx="11" cy="10" r="1.5" />
    </svg>
  );
}

function EnvIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2" />
      <path d="M4.5 1.5v12M10.5 1.5v12M1.5 5.5h12M1.5 10.5h12" />
    </svg>
  );
}

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
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={toggleSidebar} />
        <main className="flex-1 p-6 min-w-0">
          <div className="max-w-5xl mx-auto">
            <Page />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
