"use client";

import { Download } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(displayModeStandalone || navigatorStandalone);
}

export default function PwaInstallButton({
  mobile = false,
  compact = false,
  alwaysShow = false,
}: {
  mobile?: boolean;
  compact?: boolean;
  alwaysShow?: boolean;
}) {
  const t = useTranslations("common.pwaInstall");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedOverride, setInstalledOverride] = useState(false);
  const [iosTipOpen, setIosTipOpen] = useState(false);
  const [unsupportedTipOpen, setUnsupportedTipOpen] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const userAgent = hydrated ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  const isEdge = /Edg\//.test(userAgent);
  const isInstalled = installedOverride || (hydrated ? isStandalone() : false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalledOverride(true);
      setDeferredPrompt(null);
      setIosTipOpen(false);
      setUnsupportedTipOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  async function onInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (isIOS) {
      setIosTipOpen((prev) => !prev);
      return;
    }

    setUnsupportedTipOpen((prev) => !prev);
  }

  // On mobile, the browser might not expose `beforeinstallprompt` (OEM browsers, some Edge/Chrome states),
  // but users can still install via the browser menu. Keep the entry point visible.
  const alwaysVisible = alwaysShow || mobile || compact;
  if (!hydrated) {
    return alwaysVisible ? (
      <div className={`${mobile ? "space-y-2" : "relative"}`}>
        <button
          type="button"
          aria-label={t("label")}
          className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/[0.03] font-medium text-foreground/75 transition hover:bg-foreground/10 hover:text-foreground ${
            compact ? "h-9 w-9 justify-center px-0 py-0 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
          } ${mobile ? "w-full justify-center" : ""}`}
        >
          <Download size={14} />
          {compact ? null : t("button")}
        </button>
      </div>
    ) : null;
  }
  const hidden = !alwaysVisible && !deferredPrompt && !isIOS;
  if (hidden) return null;

  return (
    <div className={`${mobile ? "space-y-2" : "relative"}`}>
      <button
        type="button"
        onClick={() => void onInstallClick()}
        aria-label={t("label")}
        className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/[0.03] font-medium text-foreground/75 transition hover:bg-foreground/10 hover:text-foreground ${
          compact ? "h-9 w-9 justify-center px-0 py-0 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        } ${mobile ? "w-full justify-center" : ""}`}
      >
        <Download size={14} />
        {compact ? null : t("button")}
      </button>
      {iosTipOpen ? (
        <p
          className={`text-xs text-foreground/70 ${
            mobile
              ? "text-center"
              : "absolute right-0 top-full mt-2 w-56 rounded-lg border border-foreground/15 bg-background/95 p-2.5 shadow-xl"
          }`}
        >
          {t("iosTip")}
        </p>
      ) : null}
      {unsupportedTipOpen ? (
        <p
          className={`text-xs text-foreground/70 ${
            mobile
              ? "text-center"
              : "absolute right-0 top-full mt-2 w-64 rounded-lg border border-foreground/15 bg-background/95 p-2.5 shadow-xl"
          }`}
        >
          {isAndroid ? (
            <>
              {t("androidUnavailableBefore")} {isEdge ? t("edge") : t("browser")},{" "}
              {t("androidUnavailableAfter")}{" "}
              <span className="font-semibold text-foreground">{t("installAppOption")}</span>{" "}
              {t("or")}{" "}
              <span className="font-semibold text-foreground">{t("addToHomeOption")}</span>.
            </>
          ) : (
            <>{t("genericUnavailable")}</>
          )}
        </p>
      ) : null}
    </div>
  );
}
