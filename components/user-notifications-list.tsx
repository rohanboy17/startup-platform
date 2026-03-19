"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: string;
};

export default function UserNotificationsList({
  notifications,
  showLimitSelector = false,
}: {
  notifications: NotificationItem[];
  showLimitSelector?: boolean;
}) {
  const t = useTranslations("user.notificationsList");
  const [loading, setLoading] = useState<string | "all" | null>(null);
  const [message, setMessage] = useState("");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");
  const hydrated = useHydrated();
  const visibleNotifications = useMemo(
    () => (limit === "ALL" ? notifications : notifications.slice(0, Number(limit))),
    [limit, notifications]
  );

  async function markRead(notificationId?: string) {
    setLoading(notificationId ?? "all");
    setMessage("");

    const res = await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(notificationId ? { notificationId } : { all: true }),
    });

    const raw = await res.text();
    let data: { error?: string; message?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      data = { error: t("errors.unexpected") };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || t("errors.updateFailed"));
      return;
    }

    setMessage(data.message || t("actions.updated"));
    emitDashboardLiveRefresh();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/60">
          {t("unread", { count: notifications.filter((n) => !n.isRead).length })}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {showLimitSelector ? (
            <label className="flex items-center gap-2 text-sm text-foreground/60">
              <span>{t("controls.show")}</span>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
                className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="ALL">{t("controls.showAll")}</option>
              </select>
            </label>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void markRead()}
            disabled={loading !== null || notifications.every((n) => n.isRead)}
            className="border-foreground/20 bg-transparent text-foreground hover:bg-foreground/[0.04]"
          >
            {loading === "all" ? t("actions.updating") : t("actions.markAllRead")}
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="rounded-2xl border-foreground/10 bg-background/50">
          <CardContent className="p-6 text-sm text-foreground/60">{t("empty")}</CardContent>
        </Card>
      ) : (
        visibleNotifications.map((n) => (
          <Card
            key={n.id}
            className={`rounded-2xl border ${
              n.isRead ? "border-foreground/10 bg-background/50" : "border-emerald-400/40 bg-emerald-500/10"
            }`}
          >
            <CardContent className="space-y-2 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="font-semibold break-words">{n.title}</p>
                  {n.type ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/60">{n.type}</p> : null}
                </div>
                {!n.isRead ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void markRead(n.id)}
                    disabled={loading !== null}
                  >
                    {loading === n.id ? t("actions.saving") : t("actions.markRead")}
                  </Button>
                ) : null}
              </div>
              <p className="text-sm text-foreground/75 break-words">{n.message}</p>
              <p className="text-xs text-foreground/60" suppressHydrationWarning>
                {hydrated ? new Date(n.createdAt).toLocaleString() : ""}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
