"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveRefresh } from "@/lib/live-refresh";

type NotificationItem = {
  key: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING";
  createdAt: string;
  href: string;
};

type NotificationsResponse = {
  hours: number;
  items?: NotificationItem[];
  error?: string;
};

export default function ManagerNotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/notifications?hours=24", { credentials: "include" });
    const raw = await res.text();
    let parsed: NotificationsResponse = { hours: 24 };
    try {
      parsed = raw ? (JSON.parse(raw) as NotificationsResponse) : parsed;
    } catch {
      setError("Unexpected server response");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(parsed.error || "Failed to load notifications");
    } else {
      setError("");
      setItems(parsed.items || []);
    }
    setLoading(false);
  }, []);

  useLiveRefresh(load, 10000);

  const hasAlerts = items.length > 0;

  const grouped = useMemo(() => {
    const warnings = items.filter((item) => item.severity === "WARNING");
    const info = items.filter((item) => item.severity === "INFO");
    return { warnings, info };
  }, [items]);

  if (loading) return <p className="text-sm text-white/60">Loading notifications...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  if (!hasAlerts) {
    return (
      <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md">
        <CardContent className="space-y-2 p-6 text-sm text-white/60">
          <div className="flex items-center gap-2 text-white/75">
            <Bell size={18} />
            <p className="font-medium">No alerts right now</p>
          </div>
          <p>Queue and risk alerts will appear here automatically.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.warnings.length ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Warnings</p>
          {grouped.warnings.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <Card className="rounded-3xl border-amber-400/20 bg-amber-500/10 shadow-xl shadow-black/20 backdrop-blur-md transition hover:bg-amber-500/15">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white break-words">{item.title}</p>
                        <p className="mt-1 text-sm text-white/80 break-words">{item.message}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-white/50" />
                  </div>
                  <p className="text-xs text-white/55">{new Date(item.createdAt).toLocaleString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {grouped.info.length ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Info</p>
          {grouped.info.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-md transition hover:bg-white/10">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white break-words">{item.title}</p>
                      <p className="mt-1 text-sm text-white/70 break-words">{item.message}</p>
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-white/50" />
                  </div>
                  <p className="text-xs text-white/45">{new Date(item.createdAt).toLocaleString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

