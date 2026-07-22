import React, { useEffect, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import ProfileResult from "./pages/ProfileResult";
import { useApi } from "./hooks/useApi.jsx";
import { buildTimeRange } from "./lib/time-range.js";

function AppBody() {
  const { t } = useLocale();
  const [profileData, setProfileData] = useState(null);
  const range = buildTimeRange("total", { from: "", to: "" });
  const { data, loading, error } = useApi(range);

  useEffect(() => {
    if (data) setProfileData(data);
  }, [data]);

  return (
    <div className="min-h-screen bg-[#f3f1ec]">
      <main>
        {loading && !profileData ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
            <p className="roast-brand text-[44px] leading-none text-[#1a1a1a]">{t("app.brand")}</p>
            <p className="text-[#6b6560] text-sm font-medium">{t("app.loading")}</p>
          </div>
        ) : error && !profileData ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="roast-brand text-[44px] leading-none text-[#1a1a1a]">{t("app.brand")}</p>
            <p className="text-[#e24b4b] text-sm font-medium max-w-md">{error}</p>
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
