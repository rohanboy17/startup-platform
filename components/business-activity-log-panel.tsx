"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { toDateLocale } from "@/lib/date-locale";
import { useLiveRefresh } from "@/lib/live-refresh";

type TimelineItem = {
  id: string;
  kind: "ACTIVITY" | "PAYMENT" | "WALLET";
  action: string;
  actor: string;
  message: string;
  createdAt: string;
};

export default function BusinessActivityLogPanel() {
  const t = useTranslations("business.activityPanel");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState<"5" | "10" | "20" | "ALL">("10");

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/activity", { credentials: "include" });
    const raw = await res.text();
    let parsed: { timeline?: TimelineItem[]; error?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { timeline?: TimelineItem[]; error?: string }) : {};
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoad"));
      return;
    }
    setError("");
    setItems(parsed.timeline || []);
  }, [t]);

  useLiveRefresh(load, 10000);

  const visibleItems = useMemo(
    () => (limit === "ALL" ? items : items.slice(0, Number(limit))),
    [items, limit]
  );

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value as "5" | "10" | "20" | "ALL")}
            className="rounded-md border border-foreground/15 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="ALL">Show all</option>
          </select>
        </label>
      </div>
      {items.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-foreground/15 bg-background/50 backdrop-blur-md">
          <CardContent className="p-6 text-sm text-foreground/55">{t("empty")}</CardContent>
        </Card>
      ) : (
        visibleItems.map((item) => (
          <Card key={item.id} className="rounded-3xl border-foreground/10 bg-background/50 backdrop-blur-md">
            <CardContent className="space-y-2 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.action.replaceAll("_", " ")}</p>
                  <p className="break-all text-xs text-foreground/45">{item.kind} | {item.actor}</p>
                </div>
                <p className="text-xs text-foreground/45">
                  {new Date(item.createdAt).toLocaleString(dateLocale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="break-words text-sm text-foreground/75">{item.message}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
