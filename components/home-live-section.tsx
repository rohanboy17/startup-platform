"use client";

import { useCallback, useMemo, useState } from "react";
import { useLiveRefresh } from "@/lib/live-refresh";
import HeroLiveMetrics from "@/components/hero-live-metrics";
import { useTranslations } from "next-intl";

type LivePayload = {
  stats: {
    activeOnlineUsers: number;
    activeOnlineBusinesses: number;
    liveTasks: number;
    liveWithdraws: number;
  };
  events: Array<{
    kind: "USER" | "BUSINESS" | "TASK" | "WITHDRAW";
    message: string;
    createdAt: string;
  }>;
};

export default function HomeLiveSection() {
  const t = useTranslations("home.live");
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/public/live");
    const raw = await res.text();
    let parsed: LivePayload | { error?: string } = { error: "Unexpected response" };
    try {
      parsed = raw ? (JSON.parse(raw) as LivePayload) : parsed;
    } catch {
      parsed = { error: "Unexpected response" };
    }

    if (!res.ok) {
      setError((parsed as { error?: string }).error || t("activityError"));
      return;
    }

    setError("");
    setData(parsed as LivePayload);
  }, [t]);

  useLiveRefresh(load, 10000);


  const historyTickerText = useMemo(
    () => (data ? data.events.map((event) => event.message).join("   |   ") : ""),
    [data]
  );
  const withdrawTickerText = useMemo(
    () =>
      data
        ? data.events
            .filter((event) => event.kind === "WITHDRAW")
            .map((event) => event.message)
            .join("   |   ")
        : "",
    [data]
  );

  return (
    <div className="mx-auto w-full rounded-2xl border border-foreground/15 bg-foreground/5 p-4 backdrop-blur-none sm:rounded-3xl sm:p-6 sm:backdrop-blur-xl">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold sm:text-2xl">{t("title")}</h2>
          <p className="text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
          {t("live")}
        </span>
      </div>

      {!data && !error ? <p className="text-sm text-foreground/60">{t("loading")}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-4">
            <HeroLiveMetrics className="gap-3 sm:grid-cols-4" />
          </div>

          <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-sky-600 dark:text-sky-300/80">
              Live Withdraw Requests ({data.stats.liveWithdraws})
            </p>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="inline-block min-w-full pr-6 text-sm text-sky-700 dark:text-sky-200 [animation:marquee_18s_linear_infinite]">
                {withdrawTickerText || "No live withdraw requests right now."}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-emerald-600 dark:text-emerald-300/80">
              Activity History
            </p>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="inline-block min-w-full pr-6 text-sm text-emerald-700 dark:text-emerald-200 [animation:marquee_18s_linear_infinite]">
                {historyTickerText || "No recent activity yet. New events will appear here."}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
