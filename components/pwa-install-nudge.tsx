"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";

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

const SEEN_KEY = "earnhub:pwa_nudge_seen_v1";

export default function PwaInstallNudge() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installedOverride, setInstalledOverride] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const userAgent = hydrated ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  const installed = installedOverride || (hydrated ? isStandalone() : false);
  const seen = hydrated
    ? (() => {
        try {
          return window.localStorage.getItem(SEEN_KEY) || "";
        } catch {
          return "";
        }
      })()
    : "";

  function markSeen() {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalledOverride(true);
      markSeen();
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const open = hydrated && !installed && !dismissed && !seen;
  if (!open) return null;

  async function onInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      markSeen();
      setDeferredPrompt(null);
      setDismissed(true);
      return;
    }

    // No install prompt available. Keep the modal open and just show instructions.
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close install prompt"
        className="absolute inset-0 bg-background/40 backdrop-blur-sm"
        onClick={() => {
          markSeen();
          setDismissed(true);
        }}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-foreground/10 bg-background/95 p-5 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">
              Better on mobile
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Install FreeEarnHub for faster access
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              Installing keeps you signed in, loads faster, and improves notification reliability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              markSeen();
              setDismissed(true);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.03] text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            <Download size={16} />
            Install
          </button>
          <button
            type="button"
            onClick={() => {
              markSeen();
              setDismissed(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-foreground/15 bg-foreground/[0.03] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground"
          >
            Not now
          </button>
        </div>

        {!deferredPrompt ? (
          <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            {isIOS ? (
              <p>
                On iPhone/iPad: tap <span className="font-semibold text-foreground">Share</span>, then{" "}
                <span className="font-semibold text-foreground">Add to Home Screen</span>.
              </p>
            ) : isAndroid ? (
              <p>
                On Android: open your browser menu and choose{" "}
                <span className="font-semibold text-foreground">Install app</span> or{" "}
                <span className="font-semibold text-foreground">Add to Home screen</span>.
              </p>
            ) : (
              <p>
                Install prompt isn&apos;t available right now. Try again later or use your browser menu to install.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

