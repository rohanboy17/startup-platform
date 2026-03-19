"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { emitDashboardLiveRefresh, useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";

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
  const t = useTranslations("manager.notificationsPanel");
  const locale = useLocale();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");
  const [message, setMessage] = useState("");
  const [seenVersion, setSeenVersion] = useState(0);
  const hydrated = useHydrated();
  const storageKey = "manager_review_alerts_seen";

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/manager/notifications?hours=24", { credentials: "include" });
    const raw = await res.text();
    let parsed: NotificationsResponse = { hours: 24 };
    try {
      parsed = raw ? (JSON.parse(raw) as NotificationsResponse) : parsed;
    } catch {
      setError(t("errors.unexpected"));
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failed"));
    } else {
      setError("");
      setItems(parsed.items || []);
    }
    setLoading(false);
  }, [t]);

  useLiveRefresh(load, 10000);

  const seenMap = useMemo(() => {
    const refreshToken = seenVersion;
    if (!hydrated || typeof window === "undefined") return {} as Record<string, string>;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (refreshToken < 0) return {} as Record<string, string>;
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, [hydrated, seenVersion, storageKey]);

  const hasAlerts = items.length > 0;

  const grouped = useMemo(() => {
    const unreadItems = items.filter((item) => seenMap[item.key] !== item.createdAt);
    const visibleItems = limit === "ALL" ? unreadItems : unreadItems.slice(0, Number(limit));
    const warnings = visibleItems.filter((item) => item.severity === "WARNING");
    const info = visibleItems.filter((item) => item.severity === "INFO");
    return { warnings, info };
  }, [items, limit, seenMap]);

  function markAllRead() {
    if (typeof window === "undefined") return;
    const nextSeen = { ...seenMap };
    for (const item of items) {
      nextSeen[item.key] = item.createdAt;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(nextSeen));
    setSeenVersion((value) => value + 1);
    setMessage(t("markAllReadSuccess"));
    emitDashboardLiveRefresh();
  }

  if (loading) return <p className="text-sm text-foreground/60">{t("loading")}</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <span>{t("controls.show")}</span>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value as "5" | "10" | "20" | "ALL")}
            className="rounded-xl border border-foreground/20 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="ALL">{t("controls.showAll")}</option>
          </select>
        </label>
        <Button
          variant="outline"
          onClick={markAllRead}
          disabled={items.length === 0 || grouped.warnings.length + grouped.info.length === 0}
          className="border-foreground/20 bg-transparent text-foreground hover:bg-foreground/[0.04]"
        >
          {t("controls.markAllRead")}
        </Button>
      </div>
      {!hasAlerts ? (
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-6 text-sm text-foreground/60">
            <div className="flex items-center gap-2 text-foreground/80">
              <Bell size={18} />
              <p className="font-medium">{t("empty.title")}</p>
            </div>
            <p>{t("empty.body")}</p>
          </CardContent>
        </Card>
      ) : grouped.warnings.length + grouped.info.length === 0 ? (
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
          <CardContent className="space-y-2 p-6 text-sm text-foreground/60">
            <div className="flex items-center gap-2 text-foreground/80">
              <Bell size={18} />
              <p className="font-medium">{t("allRead.title")}</p>
            </div>
            <p>{t("allRead.body")}</p>
          </CardContent>
        </Card>
      ) : null}

      {grouped.warnings.length ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("warnings")}</p>
          {grouped.warnings.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <Card className="rounded-3xl border-amber-400/25 bg-amber-500/10 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md transition hover:bg-amber-500/15">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-200" />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground break-words">{item.title}</p>
                        <p className="mt-1 text-sm text-foreground/80 break-words">{item.message}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-foreground/50" />
                  </div>
                  <p className="text-xs text-foreground/60" suppressHydrationWarning>
                    {hydrated ? new Date(item.createdAt).toLocaleString(locale) : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {grouped.info.length ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("info")}</p>
          {grouped.info.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md transition hover:bg-background/70">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground break-words">{item.title}</p>
                      <p className="mt-1 text-sm text-foreground/70 break-words">{item.message}</p>
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-foreground/50" />
                  </div>
                  <p className="text-xs text-foreground/60" suppressHydrationWarning>
                    {hydrated ? new Date(item.createdAt).toLocaleString(locale) : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
