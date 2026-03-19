"use client";

import { useCallback, useMemo, useState } from "react";
import { BellRing, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getBrowserMessaging, isFirebaseWebConfigured } from "@/lib/firebase-client";
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
  const [data, setData] = useState<ChannelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/channels", { credentials: "include", cache: "no-store" });
      const raw = await res.text();
      let parsed: ChannelState | null = null;
      try {
        parsed = raw ? (JSON.parse(raw) as ChannelState) : null;
      } catch {
        parsed = { error: "Unexpected server response" } as ChannelState;
      }

      setData(parsed);
    } catch (error) {
      setData({
        pushConfigured: false,
        telegramConfigured: false,
        push: { enabled: false, devices: [] },
        telegram: { linked: false, chatPreview: null, connectUrl: null },
        error: error instanceof Error ? error.message : "Unable to load notification channels",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(load, 30000);

  const pushReadyInBrowser = useMemo(() => isFirebaseWebConfigured(), []);

  async function enablePush() {
    setActionLoading("push");
    setMessage("");

    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setMessage("This browser does not support device push notifications.");
        setActionLoading(null);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        setActionLoading(null);
        return;
      }

      const browserMessaging = await getBrowserMessaging();
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!browserMessaging || !vapidKey) {
        setMessage("Firebase web push is not configured yet.");
        setActionLoading(null);
        return;
      }

      // Reuse the already-registered root service worker when possible.
      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }));
      const token = await browserMessaging.getToken(browserMessaging.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setMessage("Could not get a device push token from Firebase.");
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
      setMessage(parsed.message || parsed.error || "Push updated");
      if (res.ok) {
        await load();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable push notifications");
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
      setMessage(parsed.message || parsed.error || "Test sent");
      if (res.ok) await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send test push");
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
    setMessage(parsed.message || parsed.error || "Telegram updated");
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
    setMessage(parsed.message || parsed.error || "Push device updated");
    setActionLoading(null);
    if (res.ok) {
      await load();
    }
  }

  if (loading) {
    return <p className="text-sm text-white/60">Loading delivery channels...</p>;
  }

  if (data?.error) {
    return <p className="text-sm text-rose-300">{data.error}</p>;
  }

  return (
    <SectionCard elevated className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-sm text-white/60">Delivery channels</p>
        <h3 className="text-xl font-semibold text-white">Choose how updates reach you</h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 text-emerald-200" size={18} />
            <div className="space-y-2">
              <p className="font-medium text-white">Device push notifications</p>
              <p className="text-sm text-white/65">
                Best for instant alerts on this browser or installed app.
              </p>
              {!data?.pushConfigured || !pushReadyInBrowser ? (
                <p className="text-xs text-amber-200/80">
                  Firebase push is not fully configured yet for this environment.
                </p>
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
                          {device.deviceLabel || "Registered device"}
                        </p>
                        <p className="text-xs text-white/50">
                          Last seen {new Date(device.lastSeenAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-white/15 bg-transparent text-white hover:bg-white/10"
                        disabled={actionLoading !== null}
                        onClick={() => void removePushDevice(device.id)}
                      >
                        {actionLoading === device.id ? "Removing..." : "Remove"}
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
                    ? "Enabling..."
                    : data?.push.enabled
                      ? "Register another device"
                      : "Enable on this device"}
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
                  {actionLoading === "push:test" ? "Sending..." : "Send test push"}
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
              <p className="text-sm text-white/65">
                Connect your Telegram chat to receive approval and payout updates there too.
              </p>
              {!data?.telegramConfigured ? (
                <p className="text-xs text-amber-200/80">
                  Telegram bot configuration is missing for this environment.
                </p>
              ) : data?.telegram.linked ? (
                <p className="text-xs text-emerald-200/80">
                  Connected {data.telegram.chatPreview ? `(${data.telegram.chatPreview})` : ""}
                </p>
              ) : (
                <p className="text-xs text-white/55">
                  Open the bot link once and press start to connect this account.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {data?.telegram.connectUrl ? (
                  <a
                    href={data.telegram.connectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
                  >
                    {data.telegram.linked ? "Open Telegram bot" : "Connect Telegram"}
                  </a>
                ) : null}

                {data?.telegram.linked ? (
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                    disabled={actionLoading !== null}
                    onClick={() => void disconnectTelegram()}
                  >
                    {actionLoading === "telegram" ? "Disconnecting..." : "Disconnect"}
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
          <span className="font-medium">What this unlocks</span>
        </div>
        <p className="mt-2">
          Once connected, admin broadcasts and important workflow events can be delivered through in-app, email,
          SMS, push, and Telegram without changing your core moderation or payout logic.
        </p>
      </div>

      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </SectionCard>
  );
}
