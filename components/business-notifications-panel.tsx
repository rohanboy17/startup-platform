"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, BellRing } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import NotificationChannelPreferences from "@/components/notification-channel-preferences";
import UserNotificationsList from "@/components/user-notifications-list";
import { useLiveRefresh } from "@/lib/live-refresh";

type AlertItem = {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING";
  createdAt: string;
};

type InboxItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: "INFO" | "SUCCESS" | "WARNING";
};

type NotificationsResponse = {
  activeAlerts: AlertItem[];
  inbox: InboxItem[];
  counts: {
    activeAlerts: number;
    unreadInbox: number;
  };
  error?: string;
};

export default function BusinessNotificationsPanel() {
  const t = useTranslations("business.notificationsPanel");
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/notifications", { credentials: "include" });
    const raw = await res.text();
    let parsed: NotificationsResponse = {
      activeAlerts: [],
      inbox: [],
      counts: {
        activeAlerts: 0,
        unreadInbox: 0,
      },
    };
    try {
      parsed = raw ? (JSON.parse(raw) as NotificationsResponse) : parsed;
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    setData(parsed);
  }, [t]);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-white/60">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <NotificationChannelPreferences />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">{t("kpis.activeAlerts")}</p>
            <p className="mt-2 text-3xl font-semibold text-amber-100">{data.counts.activeAlerts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">{t("kpis.unreadInbox")}</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-200">{data.counts.unreadInbox}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-200" />
          <div>
            <p className="text-sm text-white/60">{t("alerts.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("alerts.title")}</h3>
          </div>
        </div>

        {data.activeAlerts.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 text-sm text-white/55">
              {t("alerts.empty")}
            </CardContent>
          </Card>
        ) : (
          data.activeAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`rounded-3xl border backdrop-blur-md ${
                alert.severity === "WARNING"
                  ? "border-amber-400/20 bg-amber-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <CardContent className="space-y-2 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-white">{alert.title}</p>
                  <span className="text-xs text-white/45">
                    {new Date(alert.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="break-words text-sm text-white/75">{alert.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BellRing size={18} className="text-emerald-200" />
          <div>
            <p className="text-sm text-white/60">{t("inbox.eyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("inbox.title")}</h3>
          </div>
        </div>
        <UserNotificationsList notifications={data.inbox} showLimitSelector />
      </div>
    </div>
  );
}
