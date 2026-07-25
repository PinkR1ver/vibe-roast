import React, { useEffect } from "react";
import { Check, Copy, Download, Share2, X as CloseIcon } from "lucide-react";
import { createPortal } from "react-dom";

export default function SharePosterModal({
  open,
  previewUrl,
  accent,
  busy,
  nativeShareSupported,
  notice,
  onClose,
  onDownload,
  onNativeShare,
  onCopyCaption,
  t,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[3px] sm:items-center sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.posterTitle")}
        className="flex max-h-[96vh] w-full max-w-[820px] flex-col overflow-hidden rounded-t-[26px] bg-[#fffcf7] text-[#1a1a1a] shadow-[0_-16px_50px_rgba(20,14,8,0.2)] dark:bg-[#171717] dark:text-[#fafafa] sm:max-h-[92vh] sm:rounded-[26px] sm:shadow-[0_30px_80px_rgba(20,14,8,0.28)]"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3.5 dark:border-white/[0.08]">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: accent }}>
            {t("profile.posterKicker")}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="motion-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6b6560] hover:bg-black/[0.05] hover:text-[#1a1a1a] dark:text-[#a3a3a3] dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label={t("profile.posterClose")}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-auto md:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)]">
          <div className="flex items-center justify-center bg-[#ece8df] px-5 py-5 dark:bg-[#101010] sm:px-8 sm:py-7">
            <div className="aspect-[3/4] w-full max-w-[250px] overflow-hidden rounded-[16px] border border-black/[0.08] bg-[#f3f1ec] shadow-[0_20px_45px_rgba(40,28,12,0.18)] dark:border-white/[0.1] dark:bg-[#202020] sm:max-w-[320px]">
              {previewUrl ? (
                <img src={previewUrl} alt={t("profile.posterTitle")} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm font-semibold text-[#8b8680]">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {busy ? t("profile.posterBusy") : "…"}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col px-5 py-6 sm:px-8 sm:py-8">
            <div>
              <h2 className="m-0 max-w-sm text-[30px] font-extrabold leading-[1.02] tracking-tight sm:text-[36px]">
                {t("profile.posterTitle")}
              </h2>
              <p className="mb-0 mt-3 max-w-sm text-[13px] leading-relaxed text-[#6b6560] dark:text-[#b0b0b0]">
                {t("profile.posterHint")}
              </p>
              <div className="mt-4 inline-flex items-center rounded-full border border-black/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8680] dark:border-white/[0.09]">
                {t("profile.posterFormat")}
              </div>
            </div>

            <button
              type="button"
              onClick={nativeShareSupported ? onNativeShare : onDownload}
              disabled={!previewUrl || busy}
              className="motion-button mt-7 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)] disabled:opacity-50"
              style={{ background: accent }}
            >
              {nativeShareSupported ? <Share2 size={18} /> : <Download size={18} />}
              {nativeShareSupported ? t("profile.posterNativeShare") : t("profile.posterDownload")}
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCopyCaption}
                disabled={!previewUrl || busy}
                className="motion-button inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white text-[13px] font-bold text-[#1a1a1a] disabled:opacity-50 dark:border-white/[0.08] dark:bg-[#242424] dark:text-white"
              >
                <Copy size={16} />
                {t("profile.posterCopyCaption")}
              </button>
              <button
                type="button"
                onClick={onDownload}
                disabled={!previewUrl || busy}
                className="motion-button inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white text-[13px] font-bold text-[#1a1a1a] disabled:opacity-50 dark:border-white/[0.08] dark:bg-[#242424] dark:text-white"
              >
                <Download size={16} />
                {t("profile.posterDownload")}
              </button>
            </div>

            {notice && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/[0.035] px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-[#6b6560] dark:bg-white/[0.05] dark:text-[#b0b0b0]">
                <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                <span>{notice}</span>
              </div>
            )}

            <p className="mb-0 mt-auto pt-8 text-[10px] font-medium leading-relaxed text-[#8b8680] dark:text-[#8f8f8f]">
              {t("profile.posterFootnote")}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
