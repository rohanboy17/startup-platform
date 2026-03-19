"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

type NotificationFilter = "ALL" | "UNREAD" | "SUCCESS" | "WARNING" | "INFO";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string;
};

type InboxResponse = {
  unreadCount: number;
  totalCount: number;
  typeCounts: {
    success: number;
    warning: number;
    info: number;
  };
  notifications: NotificationItem[];
  error?: string;
};

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "SUCCESS", label: "Success" },
  { value: "WARNING", label: "Warnings" },
  { value: "INFO", label: "Info" },
];

function typeTone(type: string, isRead: boolean) {
  if (isRead) return "border-foreground/10 bg-background/50 text-foreground";
  if (type === "SUCCESS") return "border-emerald-400/25 bg-emerald-500/10 text-foreground";
  if (type === "WARNING") return "border-amber-400/25 bg-amber-500/10 text-foreground";
  return "border-sky-400/25 bg-sky-500/10 text-foreground";
}

export default function ManagerInboxPanel() {
  const hydrated = useHydrated();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | "all" | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/inbox", { credentials: "include" });
    const raw = await res.text();
    let parsed: InboxResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as InboxResponse) : null;
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || "Failed to load notifications");
    } else {
      setError("");
      setData(parsed);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  const filtered = useMemo(() => {
    const notifications = data?.notifications ?? [];
    switch (filter) {
      case "UNREAD":
        return notifications.filter((item) => !item.isRead);
      case "SUCCESS":
      case "WARNING":
      case "INFO":
        return notifications.filter((item) => item.type === filter);
      default:
        return notifications;
    }
  }, [data, filter]);

  async function markRead(notificationId?: string) {
    setActionLoading(notificationId ?? "all");
    setMessage("");

    const res = await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(notificationId ? { notificationId } : { all: true }),
    });

    const raw = await res.text();
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { error?: string; message?: string }) : {};
    } catch {
      parsed = { error: "Unexpected server response" };
    }

    setActionLoading(null);
    if (!res.ok) {
      setMessage(parsed.error || "Failed to update notifications");
      return;
    }

    setMessage(parsed.message || "Notifications updated");
    emitDashboardLiveRefresh();
    await load();
  }

  if (loading) return <p className="text-sm text-foreground/60">Loading notifications...</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">Loading notifications...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total notifications" value={data.totalCount} />
        <KpiCard label="Unread" value={data.unreadCount} tone="success" />
        <KpiCard label="Success Updates" value={data.typeCounts.success} tone="info" />
        <KpiCard label="Warnings" value={data.typeCounts.warning} tone="warning" />
      </div>

      <SectionCard elevated className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-foreground/60">Inbox filters</p>
            <h3 className="text-xl font-semibold text-foreground">Broadcasts and important updates</h3>
          </div>
          <Button
            variant="outline"
            onClick={() => void markRead()}
            disabled={actionLoading !== null || data.notifications.every((item) => item.isRead)}
            className="border-foreground/20 bg-transparent text-foreground hover:bg-foreground/[0.04]"
          >
            {actionLoading === "all" ? "Updating..." : "Mark all as read"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  active
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                    : "border-foreground/10 bg-background/50 text-foreground/70 hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-foreground/10 bg-background/50">
          <CardContent className="p-6 text-sm text-foreground/60">No notifications match the current filter.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={`rounded-3xl border shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md ${typeTone(item.type, item.isRead)}`}
            >
              <CardContent className="space-y-3 p-4 sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold break-words">{item.title}</p>
                    <p className="mt-1 text-sm opacity-80 break-words">{item.message}</p>
                  </div>
                  {!item.isRead ? (
                    <Button size="sm" variant="secondary" onClick={() => void markRead(item.id)} disabled={actionLoading !== null}>
                      {actionLoading === item.id ? "Saving..." : "Mark read"}
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs opacity-70">
                  <span suppressHydrationWarning>{hydrated ? new Date(item.createdAt).toLocaleString() : ""}</span>
                  <StatusBadge
                    label={item.type}
                    tone={item.type === "SUCCESS" ? "success" : item.type === "WARNING" ? "warning" : "info"}
                  />
                  {!item.isRead ? <StatusBadge label="Unread" tone="neutral" /> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
