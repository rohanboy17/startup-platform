"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export default function PwaInstallButton({ mobile = false }: { mobile?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [iosTipOpen, setIosTipOpen] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIosTipOpen(false);
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
    }
  }

  const hidden = !deferredPrompt && !isIOS;
  if (hidden) return null;

  return (
    <div className={`${mobile ? "space-y-2" : "relative"}`}>
      <button
        type="button"
        onClick={() => void onInstallClick()}
        className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/[0.03] px-3 py-1.5 text-xs font-medium text-foreground/75 transition hover:bg-foreground/10 hover:text-foreground sm:text-sm ${
          mobile ? "w-full justify-center" : ""
        }`}
      >
        <Download size={14} />
        Install App
      </button>
      {iosTipOpen ? (
        <p
          className={`text-xs text-foreground/70 ${mobile ? "text-center" : "absolute right-0 top-full mt-2 w-56 rounded-lg border border-foreground/15 bg-background/95 p-2.5 shadow-xl"}`}
        >
          On iPhone/iPad: tap Share, then “Add to Home Screen”.
        </p>
      ) : null}
    </div>
  );
}
