import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Github,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocale } from "../contexts/LocaleContext.jsx";

const PROVIDERS = [
  { id: "deepseek", name: "DeepSeek", mark: "D", color: "#4d6bfe", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com" },
  { id: "openai", name: "OpenAI", mark: "O", color: "#10a37f", model: "gpt-4.1-mini", baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", name: "Anthropic", mark: "A", color: "#d97757", model: "claude-haiku-4-5-20251001", baseUrl: "https://api.anthropic.com/v1" },
  { id: "gemini", name: "Gemini", mark: "G", color: "#4285f4", model: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "groq", name: "Groq", mark: "Q", color: "#f55036", model: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "openrouter", name: "OpenRouter", mark: "R", color: "#7c3aed", model: "openai/gpt-4.1-mini", baseUrl: "https://openrouter.ai/api/v1" },
];

function ProviderMark({ provider, size = "md" }) {
  const dimension = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <span
      className={`${dimension} inline-flex shrink-0 items-center justify-center rounded-xl font-black text-white shadow-sm`}
      style={{ background: provider.color }}
      aria-hidden="true"
    >
      {provider.mark}
    </span>
  );
}

function ChoiceCard({ icon, eyebrow, title, description, onClick, accent = "#171717" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="roast-access-choice motion-button group relative min-h-[148px] overflow-hidden rounded-[16px] border border-black/[0.07] bg-[#f7f4ef] p-4 text-left hover:border-black/[0.16] dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-white/[0.18]"
    >
      <span
        className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-[11px] text-white"
        style={{ background: accent }}
      >
        {icon}
      </span>
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8680] dark:text-[#8f8f8f]">{eyebrow}</span>
      <span className="mt-1 flex items-center justify-between gap-4 text-[16px] font-extrabold text-[#1a1a1a] dark:text-white">
        {title}
        <ArrowRight size={16} className="opacity-35 transition-transform group-hover:translate-x-1 group-hover:opacity-80" />
      </span>
      <span className="mt-1.5 block max-w-[310px] text-[13px] leading-5 text-[#716b65] dark:text-[#aaa49e]">{description}</span>
    </button>
  );
}

export default function RoastAccessModal({ open, onGenerate, onLocal }) {
  const { t } = useLocale();
  const [view, setView] = useState("choose");
  const [providerId, setProviderId] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [baseUrl, setBaseUrl] = useState(PROVIDERS[0].baseUrl);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [githubUser, setGithubUser] = useState(null);

  const provider = useMemo(
    () => PROVIDERS.find((item) => item.id === providerId) || PROVIDERS[0],
    [providerId],
  );

  useEffect(() => {
    if (!open) return undefined;
    Promise.all([
      fetch("/api/ai/providers").then((response) => response.json()),
      fetch("/api/auth/github/session").then((response) => response.json()),
    ])
      .then(([providers, session]) => {
        setGithubConfigured(Boolean(providers?.github?.configured));
        if (session?.status === "connected") setGithubUser(session.user);
      })
      .catch(() => setGithubConfigured(false));
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    async function handleGithubMessage(event) {
      if (event.origin !== window.location.origin || event.data?.type !== "vibe-roast:github-auth") return;
      if (event.data.status !== "connected") {
        setError(event.data.error || t("roastAccess.githubFailed"));
        setBusy(false);
        return;
      }
      try {
        const response = await fetch("/api/auth/github/session");
        const payload = await response.json();
        if (!response.ok || payload.status !== "connected") {
          throw new Error(payload.error || t("roastAccess.githubFailed"));
        }
        setGithubUser(payload.user || { login: "GitHub" });
        setError("");
      } catch (sessionError) {
        setError(sessionError.message);
      } finally {
        setBusy(false);
      }
    }
    window.addEventListener("message", handleGithubMessage);
    return () => window.removeEventListener("message", handleGithubMessage);
  }, [open, t]);

  if (!open) return null;

  function chooseProvider(nextProvider) {
    setProviderId(nextProvider.id);
    setModel(nextProvider.model);
    setBaseUrl(nextProvider.baseUrl);
    setError("");
  }

  function submitApi(event) {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError(t("roastAccess.keyRequired"));
      return;
    }
    setBusy(true);
    setError("");
    onGenerate({
      provider: provider.id,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
    });
  }

  function startGithub() {
    setView("github");
    setError("");
    if (githubUser) return;
    const popup = window.open(
      "/api/auth/github/start",
      "vibe-roast-github-auth",
      "popup,width=720,height=760",
    );
    if (!popup) {
      setError(t("roastAccess.popupBlocked"));
      return;
    }
    setBusy(true);
  }

  async function signOutGithub() {
    await fetch("/api/auth/github/session", { method: "DELETE" });
    setGithubUser(null);
    setError("");
  }

  function generateHostedRoast() {
    onGenerate({
      mode: "hosted",
      provider: "cloudflare",
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#201b17]/30 p-0 sm:items-center sm:p-5 dark:bg-black/55">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="roast-access-title"
        className="roast-access-modal animate-tt-modal relative max-h-[96vh] w-full max-w-[720px] overflow-x-hidden overflow-y-auto rounded-t-[22px] border border-black/[0.07] bg-[#fffcf7] text-[#1a1a1a] shadow-[0_24px_70px_rgba(45,30,18,0.22)] dark:border-white/[0.08] dark:bg-[#171717] dark:text-white sm:max-h-[92vh] sm:rounded-[22px]"
      >
        <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
          {view !== "choose" && (
            <button
              type="button"
              onClick={() => {
                setView("choose");
                setError("");
                setBusy(false);
              }}
              className="motion-button mb-5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-[#77716b] hover:bg-black/[0.05] dark:text-[#aaa49e] dark:hover:bg-white/[0.06]"
            >
              <ArrowLeft size={13} />
              {t("roastAccess.back")}
            </button>
          )}

          <header className={view === "choose" ? "mb-6" : "mb-5"}>
            <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff5a1f]">
              <Sparkles size={13} />
              {t("roastAccess.kicker")}
            </div>
            <h2 id="roast-access-title" className="max-w-[590px] text-[27px] font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[32px]">
              {view === "choose" && t("roastAccess.title")}
              {view === "api" && t("roastAccess.apiTitle")}
              {view === "github" && t("roastAccess.githubTitle")}
            </h2>
            <p className="mt-2.5 max-w-[590px] text-[13px] leading-5 text-[#716b65] dark:text-[#aaa49e]">
              {view === "choose" && t("roastAccess.subtitle")}
              {view === "api" && t("roastAccess.apiSubtitle")}
              {view === "github" && t("roastAccess.githubSubtitle")}
            </p>
          </header>

          {view === "choose" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  icon={<KeyRound size={18} />}
                  eyebrow={t("roastAccess.ownKey")}
                  title={t("roastAccess.apiChoice")}
                  description={t("roastAccess.apiDescription")}
                  accent="#ff5a1f"
                  onClick={() => setView("api")}
                />
                <ChoiceCard
                  icon={<Github size={19} />}
                  eyebrow={t("roastAccess.freeTier")}
                  title={githubUser ? `@${githubUser.login}` : t("roastAccess.githubChoice")}
                  description={githubUser ? t("roastAccess.githubSignedInDescription") : t("roastAccess.githubDescription")}
                  accent="#171717"
                  onClick={() => {
                    setView("github");
                    setError("");
                  }}
                />
              </div>
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-black/[0.07] pt-5 sm:flex-row dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-[11px] text-[#807a74] dark:text-[#99938d]">
                  <ShieldCheck size={14} className="text-[#0ba875]" />
                  {t("roastAccess.privacy")}
                </div>
                <button
                  type="button"
                  onClick={onLocal}
                  className="motion-button rounded-lg px-3 py-2 text-[11px] font-bold text-[#77716b] hover:bg-black/[0.05] dark:text-[#aaa49e] dark:hover:bg-white/[0.06]"
                >
                  {t("roastAccess.local")}
                </button>
              </div>
            </>
          )}

          {view === "api" && (
            <form onSubmit={submitApi}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROVIDERS.map((item) => {
                  const selected = item.id === provider.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => chooseProvider(item)}
                      className={`motion-button flex min-w-0 items-center gap-2 rounded-[15px] border p-2.5 text-left ${
                        selected
                          ? "border-black/[0.16] bg-white shadow-sm dark:border-white/[0.2] dark:bg-white/[0.08]"
                          : "border-black/[0.06] bg-white/40 hover:bg-white dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <ProviderMark provider={item} size="sm" />
                      <span className="min-w-0 truncate text-[11px] font-black">{item.name}</span>
                      {selected && <Check size={12} className="ml-auto shrink-0 text-[#0ba875]" />}
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-[#77716b] dark:text-[#aaa49e]">
                  API Key
                  <span className="normal-case tracking-normal text-[#aaa49e]">{t("roastAccess.sessionOnly")}</span>
                </span>
                <div className="flex items-center rounded-[15px] border border-black/[0.09] bg-white px-3 dark:border-white/[0.1] dark:bg-black/20">
                  <LockKeyhole size={14} className="shrink-0 text-[#aaa49e]" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={t("roastAccess.keyPlaceholder", { provider: provider.name })}
                    autoComplete="off"
                    spellCheck="false"
                    className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-[#bbb5ae] dark:placeholder:text-[#686868]"
                  />
                </div>
              </label>

              <label className="mt-3 block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[#77716b] dark:text-[#aaa49e]">
                  {t("roastAccess.model")}
                </span>
                <input
                  type="text"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="h-12 w-full rounded-[15px] border border-black/[0.09] bg-white px-4 text-sm font-semibold outline-none focus:border-black/[0.22] dark:border-white/[0.1] dark:bg-black/20 dark:focus:border-white/[0.25]"
                />
              </label>

              <button
                type="button"
                onClick={() => setAdvanced((value) => !value)}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#817b75] dark:text-[#99938d]"
              >
                <ChevronDown size={13} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
                {t("roastAccess.advanced")}
              </button>
              {advanced && (
                <label className="mt-2 block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[#77716b] dark:text-[#aaa49e]">
                    Base URL
                  </span>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    className="h-11 w-full rounded-[14px] border border-black/[0.09] bg-white px-4 text-xs outline-none dark:border-white/[0.1] dark:bg-black/20"
                  />
                </label>
              )}

              {error && <p className="mt-3 rounded-xl bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="motion-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#ff5a1f] text-sm font-black text-white shadow-[0_12px_25px_rgba(255,90,31,0.22)] disabled:opacity-55"
              >
                {busy ? t("roastAccess.generating") : t("roastAccess.generate")}
                {!busy && <ArrowRight size={15} />}
              </button>
            </form>
          )}

          {view === "github" && (
            <div>
              <div className="rounded-[20px] border border-black/[0.07] bg-white/70 p-5 dark:border-white/[0.08] dark:bg-white/[0.035]">
                {!githubUser ? (
                  <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
                    <Github size={28} className="mb-3" />
                    <p className="max-w-sm text-sm font-bold">
                      {githubConfigured ? t("roastAccess.githubOneClick") : t("roastAccess.githubUnavailable")}
                    </p>
                    {error && <p className="mt-2 max-w-md text-xs leading-5 text-red-600 dark:text-red-400">{error}</p>}
                    {!busy && (
                      <button
                        type="button"
                        onClick={startGithub}
                        className="motion-button mt-4 inline-flex h-12 min-w-[230px] items-center justify-center gap-2 rounded-[14px] bg-[#171717] px-5 text-sm font-black text-white shadow-[0_12px_25px_rgba(0,0,0,0.14)] dark:bg-white dark:text-[#171717]"
                      >
                        <Github size={17} />
                        {t("roastAccess.continueGithub")}
                      </button>
                    )}
                    {busy && <p className="mt-4 text-xs text-[#817b75] dark:text-[#99938d]">{t("roastAccess.waiting")}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    {githubUser.avatarUrl ? (
                      <img src={githubUser.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171717] text-white"><Github size={20} /></span>
                    )}
                    <p className="mt-3 text-sm font-black">@{githubUser.login}</p>
                    <p className="mt-1 text-xs text-[#817b75] dark:text-[#99938d]">{t("roastAccess.githubConnected")}</p>
                    {error && (
                      <p className="mt-3 w-full rounded-xl bg-red-500/[0.08] px-3 py-2 text-left text-xs font-semibold leading-5 text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={generateHostedRoast}
                      disabled={busy}
                      className="motion-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#171717] text-sm font-black text-white disabled:opacity-55 dark:bg-white dark:text-[#171717]"
                    >
                      {busy ? t("roastAccess.generating") : t("roastAccess.generateFree")}
                      {!busy && <Sparkles size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("api")}
                      disabled={busy}
                      className="mt-3 text-[11px] font-bold text-[#817b75] underline-offset-4 hover:underline disabled:opacity-50 dark:text-[#99938d]"
                    >
                      {t("roastAccess.chooseProvider")}
                    </button>
                    <button
                      type="button"
                      onClick={signOutGithub}
                      className="mt-3 text-[11px] font-bold text-[#817b75] underline-offset-4 hover:underline dark:text-[#99938d]"
                    >
                      {t("roastAccess.signOut")}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#817b75] dark:text-[#99938d]">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0ba875]" />
                {t("roastAccess.githubPrivacy")}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
