import React, { useEffect, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import ProfileResult from "./pages/ProfileResult";
import { useApi } from "./hooks/useApi.jsx";
import { buildTimeRange } from "./lib/time-range.js";

function TopBar() {
  const { t, toggleLocale } = useLocale();

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-[#f3f1ec]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[#ff5a1f] text-white">
            V
          </div>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">Vibe Wrapper</span>
          <span className="ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#fff0e8] text-[#c45c26]">
            {t("app.profileView")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLocale}
            className="h-8 px-2 rounded-lg text-[11px] font-semibold text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5 transition-colors"
            title="Language"
          >
            {t("app.language")}
          </button>
          <a
            href="https://github.com/PinkR1ver/vibe-wrapper"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/5 transition-colors"
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

function AppBody() {
  const [profileData, setProfileData] = useState(null);
  const range = buildTimeRange("total", { from: "", to: "" });
  const { data, loading, error } = useApi(range);

  useEffect(() => {
    if (data) setProfileData(data);
  }, [data]);

  return (
    <div className="min-h-screen bg-[#f3f1ec]">
      <TopBar />
      <main>
        {loading && !profileData ? (
          <div className="min-h-[calc(100vh-49px)] flex items-center justify-center text-[#6b6560] text-sm font-semibold">
            Loading roast…
          </div>
        ) : error && !profileData ? (
          <div className="min-h-[calc(100vh-49px)] flex items-center justify-center text-[#e24b4b] text-sm font-semibold px-6 text-center">
            {error}
          </div>
        ) : (
          <ProfileResult data={profileData} />
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
