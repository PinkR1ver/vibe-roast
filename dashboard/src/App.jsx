import React, { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import ProfileResult from "./pages/ProfileResult";
import RoastAccessModal from "./components/RoastAccessModal";
import { useApi } from "./hooks/useApi.jsx";
import { buildTimeRange } from "./lib/time-range.js";

function AppBody() {
  const { t } = useLocale();
  const [profileData, setProfileData] = useState(null);
  const [accessOpen, setAccessOpen] = useState(true);
  const restoreAttempted = useRef(false);
  const range = buildTimeRange("total", { from: "", to: "" });
  const { data, loading, error } = useApi(range);

  useEffect(() => {
    if (data) setProfileData(data);
  }, [data]);

  async function generateRoast(config) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...config,
          evidence: profileData?.roast_evidence,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || `HTTP ${response.status}`;
        throw new Error(message);
      }
      if (!payload?.generated) throw new Error("The roast writer returned no result.");
      setProfileData((current) => ({
        ...current,
        vibe_profile: {
          ...current?.vibe_profile,
          ...payload.generated,
          roast_source: "ai",
        },
      }));
      setAccessOpen(false);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Roast generation timed out. Try again or use the local roast.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  useEffect(() => {
    if (!profileData?.roast_evidence || restoreAttempted.current) return;
    restoreAttempted.current = true;
    let active = true;
    fetch("/api/auth/github/session")
      .then((response) => response.json())
      .then((session) => {
        if (active && session?.status === "connected") {
          return generateRoast({ mode: "hosted", provider: "cloudflare" });
        }
        return null;
      })
      .catch(() => {
        // Keep the access modal available when automatic profile restoration fails.
      });
    return () => {
      active = false;
    };
  }, [profileData?.roast_evidence]);

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#171717] transition-colors dark:bg-[#0a0a0a] dark:text-[#fafafa]">
      <main>
        {loading && !profileData ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
            <p className="roast-brand text-[44px] leading-none text-[#1a1a1a] dark:text-[#fafafa]">{t("app.brand")}</p>
            <p className="text-[#6b6560] text-sm font-medium dark:text-[#a3a3a3]">{t("app.loading")}</p>
          </div>
        ) : error && !profileData ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="roast-brand text-[44px] leading-none text-[#1a1a1a] dark:text-[#fafafa]">{t("app.brand")}</p>
            <p className="text-[#e24b4b] text-sm font-medium max-w-md">{error}</p>
          </div>
        ) : (
          <>
            <div className={accessOpen ? "pointer-events-none select-none blur-[3px]" : ""} aria-hidden={accessOpen}>
              <ProfileResult data={profileData} />
            </div>
            <RoastAccessModal
              open={accessOpen}
              onGenerate={generateRoast}
              onLocal={() => setAccessOpen(false)}
            />
          </>
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
