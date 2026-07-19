import React, { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import Dashboard from "./pages/Dashboard";
import ProfileResult from "./pages/ProfileResult";
import { useApi } from "./hooks/useApi.jsx";
import { buildTimeRange } from "./lib/time-range.js";

/* ── Top Bar ─────────────────────────────────────────────── */

function TopBar({ view, onShowRoast, onShowDashboard }) {
  const { theme, cycle } = useTheme();
  const { t, toggleLocale } = useLocale();
  const roastMode = view === "profile";

  return (
    <header
      className={
        roastMode
          ? "sticky top-0 z-10 border-b border-black/5 bg-[#f3f1ec]/90 backdrop-blur-md"
          : "sticky top-0 z-10 border-b border-oai-gray-800 bg-oai-gray-950/80 backdrop-blur-md"
      }
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
        <button
          type="button"
          onClick={onShowRoast}
          className="flex items-center gap-2.5 text-left"
          title={t("app.profileView")}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              roastMode ? "bg-[#ff5a1f] text-white" : "bg-brand-600 text-white"
            }`}
          >
            V
          </div>
          <span className={`text-[13px] font-semibold ${roastMode ? "text-[#1a1a1a]" : "text-oai-white"}`}>
            Vibe Wrapper
          </span>
          <span
            className={`ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              roastMode ? "bg-[#fff0e8] text-[#c45c26]" : "bg-oai-gray-800 text-brand-400"
            }`}
          >
            {roastMode ? t("app.profileView") : t("app.dashboardView")}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={roastMode ? onShowDashboard : onShowRoast}
            className={`h-8 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
              roastMode
                ? "text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5"
                : "text-oai-gray-500 hover:text-oai-white hover:bg-oai-gray-800"
            }`}
          >
            {roastMode ? t("app.dashboardView") : t("app.profileView")}
          </button>
          <a
            href="/assests/live-report.html"
            className={`h-8 px-2 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center ${
              roastMode
                ? "text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5"
                : "text-oai-gray-500 hover:text-oai-white hover:bg-oai-gray-800"
            }`}
            title={t("app.demoAssets")}
          >
            {t("app.demoAssets")}
          </a>
          <button
            onClick={toggleLocale}
            className={`h-8 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
              roastMode
                ? "text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5"
                : "text-oai-gray-500 hover:text-oai-white hover:bg-oai-gray-800"
            }`}
            title="Language"
          >
            {t("app.language")}
          </button>
          {!roastMode && (
            <button
              onClick={cycle}
              className="p-2 rounded-lg text-oai-gray-500 hover:text-oai-white hover:bg-oai-gray-800 transition-colors"
              title={`${t("app.theme")}: ${theme}`}
            >
              <ThemeIcon theme={theme} />
            </button>
          )}
          <a
            href="https://github.com/PinkR1ver/vibe-wrapper"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-lg transition-colors ${
              roastMode
                ? "text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5"
                : "text-oai-gray-500 hover:text-oai-white hover:bg-oai-gray-800"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor">
              <path d="M7.5.5a7 7 0 0 0-2.21 13.64c.35.06.48-.15.48-.33v-1.16c-1.97.42-2.38-.94-2.38-.94-.33-.82-.8-1.04-.8-1.04-.64-.44.05-.43.05-.43.71.05 1.09.72 1.09.72.64 1.08 1.67.77 2.07.59.06-.46.25-.77.45-.95-1.58-.18-3.24-.78-3.24-3.5 0-.77.28-1.4.73-1.9-.07-.18-.32-.9.07-1.87 0 0 .6-.19 1.95.73A6.8 6.8 0 0 1 7.5 3.9a6.8 6.8 0 0 1 1.78.24c1.35-.92 1.95-.73 1.95-.73.39.97.14 1.69.07 1.87.45.5.73 1.13.73 1.9 0 2.73-1.66 3.32-3.25 3.5.26.22.48.65.48 1.3v1.93c0 .18.13.4.49.33A7 7 0 0 0 7.5.5Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
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

/* ── App Shell ─────────────────────────────────────────────── */

function AppBody() {
  const [view, setView] = useState("profile");
  const [profileData, setProfileData] = useState(null);
  const range = buildTimeRange("total", { from: "", to: "" });
  const { data, loading, error } = useApi(range);

  useEffect(() => {
    if (data) setProfileData(data);
  }, [data]);

  return (
    <div className={`min-h-screen ${view === "profile" ? "bg-[#f3f1ec]" : "bg-oai-gray-950"}`}>
      <TopBar
        view={view}
        onShowRoast={() => setView("profile")}
        onShowDashboard={() => setView("dashboard")}
      />
      <main>
        {view === "profile" ? (
          loading && !profileData ? (
            <div className="min-h-[calc(100vh-49px)] flex items-center justify-center text-[#6b6560] text-sm font-semibold">
              Loading roast…
            </div>
          ) : error && !profileData ? (
            <div className="min-h-[calc(100vh-49px)] flex items-center justify-center text-[#e24b4b] text-sm font-semibold px-6 text-center">
              {error}
            </div>
          ) : (
            <ProfileResult
              data={profileData}
              onBack={() => setView("dashboard")}
            />
          )
        ) : (
          <Dashboard
            onOpenProfile={(next) => {
              setProfileData(next);
              setView("profile");
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function AppShell() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AppBody />
      </LocaleProvider>
    </ThemeProvider>
  );
}
