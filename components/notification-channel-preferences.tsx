"use client";

import { useCallback, useMemo, useState } from "react";
import { getToken } from "firebase/messaging";
import { useTranslations } from "next-intl";
import { BellRing, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  ensureFirebaseMessagingServiceWorker,
  getBrowserMessaging,
  isFirebaseWebConfigured,
  isFirebaseWebPushSupportedInBrowser,
} from "@/lib/firebase-client";
import { useLiveRefresh } from "@/lib/live-refresh";

type ChannelState = {
  pushConfigured: boolean;
  telegramConfigured: boolean;
  push: {
    enabled: boolean;
    devices: Array<{
      id: string;
      platform?: string | null;
      deviceLabel?: string | null;
      lastSeenAt: string;
    }>;
  };
  telegram: {
    linked: boolean;
    chatPreview?: string | null;
    connectUrl?: string | null;
  };
  error?: string;
};

export default function NotificationChannelPreferences() {
  const t = useTranslations("notifications.channels");
  const [data, setData] = useState<ChannelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications/channels", { credentials: "include", cache: "no-store" });
    const raw = await res.text();
    let parsed: ChannelState | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as ChannelState) : null;
    } catch {
      parsed = { error: t("errors.unexpected") } as ChannelState;
    }

    setData(parsed);
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 30000);

  const pushReadyInBrowser = useMemo(
    () => isFirebaseWebConfigured() && isFirebaseWebPushSupportedInBrowser(),
    []
  );

  async function enablePush() {
    setActionLoading("push");
    setMessage("");

    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setMessage("This browser does not support device push notifications.");
        setMessage(t("push.unsupportedBrowser"));
        setActionLoading(null);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(t("push.permissionDenied"));
        setActionLoading(null);
        return;
      }

      const messaging = await getBrowserMessaging();
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!messaging || !vapidKey) {
        setMessage(t("push.notConfigured"));
        setActionLoading(null);
        return;
      }

      // Reuse the already-registered root service worker when possible.
      const registration = await ensureFirebaseMessagingServiceWorker();
      if (!registration) {
        setMessage(t("push.unsupportedBrowser"));
        setActionLoading(null);
        return;
      }
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setMessage(t("push.tokenFailed"));
        setActionLoading(null);
        return;
      }

      const deviceLabel = `${navigator.platform || "Device"} ${navigator.userAgent.includes("Mobile") ? "Mobile" : "Browser"}`;
      const res = await fetch("/api/notifications/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          deviceLabel,
          platform: navigator.userAgent,
        }),
      });

      const raw = await res.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
      setMessage(parsed.message || parsed.error || t("messages.pushUpdated"));
      if (res.ok) {
        await load();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("errors.enablePushFailed"));
    }

    setActionLoading(null);
  }

  async function sendTestPush() {
    setActionLoading("push:test");
    setMessage("");

    try {
      const res = await fetch("/api/notifications/push/test", {
        method: "POST",
        credentials: "include",
      });

      const raw = await res.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
      setMessage(parsed.message || parsed.error || t("messages.testSent"));
      if (res.ok) await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("errors.sendTestFailed"));
    }

    setActionLoading(null);
  }

  async function disconnectTelegram() {
    setActionLoading("telegram");
    setMessage("");
    const res = await fetch("/api/notifications/channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ channel: "TELEGRAM" }),
    });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    setMessage(parsed.message || parsed.error || t("messages.telegramUpdated"));
    setActionLoading(null);
    if (res.ok) {
      await load();
    }
  }

  async function removePushDevice(tokenId: string) {
    setActionLoading(tokenId);
    setMessage("");
    const res = await fetch("/api/notifications/channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ channel: "PUSH", tokenId }),
    });
    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};
    setMessage(parsed.message || parsed.error || t("messages.pushDeviceUpdated"));
    setActionLoading(null);
    if (res.ok) {
      await load();
    }
  }

  if (loading) {
    return <p className="text-sm text-white/60">{t("loading")}</p>;
  }

  return (
    <SectionCard elevated className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-sm text-white/60">{t("eyebrow")}</p>
        <h3 className="text-xl font-semibold text-white">{t("title")}</h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 text-emerald-200" size={18} />
            <div className="space-y-2">
              <p className="font-medium text-white">Device push notifications</p>
              <p className="text-sm text-white/65">{t("push.body")}</p>
              {!data?.pushConfigured || !pushReadyInBrowser ? (
                <p className="text-xs text-amber-200/80">{t("push.configWarning")}</p>
              ) : null}
              {data?.push.devices.length ? (
                <div className="space-y-2">
                  {data.push.devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">
                          {device.deviceLabel || t("push.registeredDevice")}
                        </p>
                        <p className="text-xs text-white/50">
                          {t("push.lastSeen", { value: new Date(device.lastSeenAt).toLocaleString() })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-white/15 bg-transparent text-white hover:bg-white/10"
                        disabled={actionLoading !== null}
                        onClick={() => void removePushDevice(device.id)}
                      >
                        {actionLoading === device.id ? t("push.removing") : t("push.remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  onClick={() => void enablePush()}
                  disabled={actionLoading !== null || !data?.pushConfigured || !pushReadyInBrowser}
                  className="w-full sm:w-auto"
                >
                  {actionLoading === "push"
                    ? t("push.enabling")
                    : data?.push.enabled
                      ? t("push.registerAnother")
                      : t("push.enableThisDevice")}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void sendTestPush()}
                  disabled={
                    actionLoading !== null ||
                    !data?.pushConfigured ||
                    !pushReadyInBrowser ||
                    !data?.push.enabled
                  }
                  className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                >
                  {actionLoading === "push:test" ? t("push.sending") : t("push.sendTest")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <Send className="mt-0.5 text-sky-200" size={18} />
            <div className="space-y-2">
              <p className="font-medium text-white">Telegram alerts</p>
              <p className="text-sm text-white/65">{t("telegram.body")}</p>
              {!data?.telegramConfigured ? (
                <p className="text-xs text-amber-200/80">{t("telegram.configWarning")}</p>
              ) : data?.telegram.linked ? (
                <p className="text-xs text-emerald-200/80">
                  {t("telegram.connected", {
                    preview: data.telegram.chatPreview ? `(${data.telegram.chatPreview})` : "",
                  })}
                </p>
              ) : (
                <p className="text-xs text-white/55">{t("telegram.help")}</p>
              )}

              <div className="flex flex-wrap gap-3">
                {data?.telegram.connectUrl ? (
                  <a
                    href={data.telegram.connectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
                  >
                    {data.telegram.linked ? t("telegram.openBot") : t("telegram.connect")}
                  </a>
                ) : null}

                {data?.telegram.linked ? (
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                    disabled={actionLoading !== null}
                    onClick={() => void disconnectTelegram()}
                  >
                    {actionLoading === "telegram" ? t("telegram.disconnecting") : t("telegram.disconnect")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
        <div className="flex items-center gap-2 text-white">
          <BellRing size={16} className="text-emerald-200" />
          <span className="font-medium">{t("benefits.title")}</span>
        </div>
        <p className="mt-2">{t("benefits.body")}</p>
      </div>

      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </SectionCard>
  );
}
