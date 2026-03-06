"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { emitDashboardLiveRefresh } from "@/lib/live-refresh";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export default function UserNotificationsList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | "all" | null>(null);
  const [message, setMessage] = useState("");

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
      data = { error: "Unexpected server response" };
    }

    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to update notifications");
      return;
    }

    setMessage(data.message || "Updated");
    router.refresh();
    emitDashboardLiveRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">Unread: {notifications.filter((n) => !n.isRead).length}</p>
        <Button
          variant="outline"
          onClick={() => markRead()}
          disabled={loading !== null || notifications.every((n) => n.isRead)}
        >
          {loading === "all" ? "Updating..." : "Mark all as read"}
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6 text-sm text-white/60">No notifications yet.</CardContent>
        </Card>
      ) : (
        notifications.map((n) => (
          <Card
            key={n.id}
            className={`rounded-2xl border ${
              n.isRead ? "border-white/10 bg-white/5" : "border-emerald-400/40 bg-emerald-500/10"
            }`}
          >
            <CardContent className="space-y-2 p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{n.title}</p>
                {!n.isRead ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => markRead(n.id)}
                    disabled={loading !== null}
                  >
                    {loading === n.id ? "Saving..." : "Mark read"}
                  </Button>
                ) : null}
              </div>
              <p className="text-sm text-white/70">{n.message}</p>
              <p className="text-xs text-white/50">{new Date(n.createdAt).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))
      )}

      {message ? <p className="text-xs text-white/60">{message}</p> : null}
    </div>
  );
}
