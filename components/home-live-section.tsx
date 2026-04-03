"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveRefresh } from "@/lib/live-refresh";
import HeroLiveMetrics from "@/components/hero-live-metrics";
import { useTranslations } from "next-intl";
import { mergeMetricMaximums } from "@/lib/display-metrics";

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

const WITHDRAW_ROTATION_MS = 12000;
const ACTIVITY_ROTATION_MS = 15000;

export default function HomeLiveSection() {
  const t = useTranslations("home.live");
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState("");
  const [withdrawIndex, setWithdrawIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);

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
    const next = parsed as LivePayload;
    setData((current) =>
      current
        ? {
            ...next,
            stats: mergeMetricMaximums(current.stats, next.stats),
          }
        : next
    );
  }, [t]);

  useLiveRefresh(load, 10000);

  const withdrawalItems = useMemo(
    () => (data?.events ?? []).filter((item) => item.kind === "WITHDRAW"),
    [data]
  );

  const activityItems = useMemo(
    () => (data?.events ?? []).filter((item) => item.kind !== "WITHDRAW"),
    [data]
  );

  useEffect(() => {
    if (withdrawalItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setWithdrawIndex((current) => (current + 1) % withdrawalItems.length);
    }, WITHDRAW_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [withdrawalItems.length]);

  useEffect(() => {
    if (activityItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setActivityIndex((current) => (current + 1) % activityItems.length);
    }, ACTIVITY_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [activityItems.length]);

  const currentWithdrawalText =
    withdrawalItems[withdrawIndex % Math.max(1, withdrawalItems.length)]?.message || t("noLiveWithdraw");
  const currentActivityText =
    activityItems[activityIndex % Math.max(1, activityItems.length)]?.message || t("noActivity");

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
              {t("withdrawRequests")} ({data.stats.liveWithdraws})
            </p>
            <div className="min-h-[52px] overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-background/60 px-3 py-2 flex items-center">
              <div
                key={`withdraw-${withdrawIndex}-${currentWithdrawalText}`}
                className="inline-block min-w-full pr-8 text-sm leading-6 text-sky-700 dark:text-sky-200 [animation:marquee_12s_linear_forwards]"
              >
                {currentWithdrawalText}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-emerald-600 dark:text-emerald-300/80">
              {t("activityHistory")}
            </p>
            <div className="min-h-[52px] overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-background/60 px-3 py-2 flex items-center">
              <div
                key={`activity-${activityIndex}-${currentActivityText}`}
                className="inline-block min-w-full pr-8 text-sm leading-6 text-emerald-700 dark:text-emerald-200 [animation:marquee_15s_linear_forwards]"
              >
                {currentActivityText}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
