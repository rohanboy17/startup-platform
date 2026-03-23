"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { getToken } from "firebase/messaging";
import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  ensureFirebaseMessagingServiceWorker,
  getBrowserMessaging,
  isFirebaseWebConfigured,
  isFirebaseWebPushSupportedInBrowser,
} from "@/lib/firebase-client";
import { useLiveRefresh } from "@/lib/live-refresh";

type ChannelState = {
  pushConfigured: boolean;
  push: { enabled: boolean };
};

const AUTO_PROMPT_KEY = "earnhub:auto_push_empty_campaigns_v1";

function nowMs() {
  return Date.now();
}

function shouldThrottleAutoPrompt() {
  try {
    const last = Number(window.localStorage.getItem(AUTO_PROMPT_KEY) || "0");
    // Throttle: at most once per 24 hours per browser profile.
    return last > 0 && nowMs() - last < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markAutoPromptAttempt() {
  try {
    window.localStorage.setItem(AUTO_PROMPT_KEY, String(nowMs()));
  } catch {
    // ignore
  }
}

export default function EmptyCampaignsPushNudge() {
  const t = useTranslations("user.tasks");
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const autoTriggered = useRef(false);

  const pushReadyInBrowser = useMemo(
    () => isFirebaseWebConfigured() && isFirebaseWebPushSupportedInBrowser(),
    []
  );

  const loadChannels = useCallback(async () => {
    const res = await fetch("/api/notifications/channels", { credentials: "include", cache: "no-store" });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as ChannelState) : null;
    if (!res.ok || !parsed) {
      setChannels(null);
      return;
    }
    setChannels(parsed);
  }, []);

  const enablePush = useCallback(async () => {
    setLoading(true);
    setMessage("");
    markAutoPromptAttempt();

    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setMessage(t("pushUnsupported"));
        setLoading(false);
        return;
      }

      if (!pushReadyInBrowser) {
        setMessage(t("pushNotConfigured"));
        setLoading(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(t("pushPermissionDenied"));
        setLoading(false);
        return;
      }

      const messaging = await getBrowserMessaging();
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!messaging || !vapidKey) {
        setMessage(t("pushNotConfigured"));
        setLoading(false);
        return;
      }

      const registration = await ensureFirebaseMessagingServiceWorker();
      if (!registration) {
        setMessage(t("pushUnsupported"));
        setLoading(false);
        return;
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) {
        setMessage(t("pushRegisterFailed"));
        setLoading(false);
        return;
      }

      const deviceLabel = `${navigator.platform || "Device"} ${navigator.userAgent.includes("Mobile") ? "Mobile" : "Browser"}`;
      const res = await fetch("/api/notifications/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, deviceLabel, platform: navigator.userAgent }),
      });

      const raw = await res.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
      if (!res.ok) {
        setMessage(parsed.error || t("pushEnableFailed"));
        setLoading(false);
        return;
      }

      setMessage(t("pushEnabled"));
      await loadChannels();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("pushEnableFailed"));
    }

    setLoading(false);
  }, [loadChannels, pushReadyInBrowser, router, t]);

  // Keep channel state fresh without calling setState directly from an effect in this component.
  useLiveRefresh(loadChannels, 30000);

  const maybeAutoEnable = useCallback(() => {
    if (autoTriggered.current) return;
    if (!channels) return;
    if (!channels.pushConfigured || !pushReadyInBrowser) return;
    if (channels.push.enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (shouldThrottleAutoPrompt()) return;

    autoTriggered.current = true;
    void enablePush();
  }, [channels, enablePush, pushReadyInBrowser]);

  // Attempt auto-enable shortly after the first successful channels fetch.
  useLiveRefresh(maybeAutoEnable, 5000);

  if (channels?.push.enabled) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl rounded-3xl border border-foreground/10 bg-background/60 p-5 text-left shadow-[0_20px_70px_-50px_rgba(0,0,0,0.8)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
            <BellRing size={18} className="text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t("pushNudgeTitle")}</p>
            <p className="text-sm text-foreground/70">
              {t("pushNudgeBody")}
            </p>
            {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
          </div>
        </div>

        <Button
          onClick={() => void enablePush()}
          disabled={loading || !channels?.pushConfigured || !pushReadyInBrowser}
          className="w-full sm:w-auto"
        >
          {loading ? t("pushEnabling") : t("pushEnableButton")}
        </Button>
      </div>
    </div>
  );
}
