"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveRefresh } from "@/lib/live-refresh";
import HeroLiveMetrics from "@/components/hero-live-metrics";
import { useTranslations } from "next-intl";
import { mergeMetricMaximums } from "@/lib/display-metrics";
import {
  generateActivityItem,
  type FakeLiveFeedItem,
} from "@/lib/fake-live-feed";
import { getMetricsDayKey } from "@/lib/fake-metrics";

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
  const WITHDRAW_ROTATION_MS = 12000;
  const ACTIVITY_ROTATION_MS = 15000;
  const t = useTranslations("home.live");
  const [data, setData] = useState<LivePayload | null>(null);
  const [feed, setFeed] = useState<FakeLiveFeedItem[]>([]);
  const [error, setError] = useState("");
  const [, setFeedSequence] = useState(0);
  const [withdrawIndex, setWithdrawIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [currentActivityText, setCurrentActivityText] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/live-feed", { cache: "no-store" });
        if (!res.ok) return;
        const initial = (await res.json()) as FakeLiveFeedItem[];
        if (!cancelled) {
          setFeed(initial);
        }
      } catch {
        // ignore: the stats panel still works even if synthetic feed fails initially
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    const dayKey = getMetricsDayKey();

    const schedule = () => {
      const delay = 5000 + Math.floor(Math.random() * 4000);
      timer = window.setTimeout(() => {
        setFeedSequence((currentSequence) => {
          const nextSequence = currentSequence + 1;
          setFeed((current) => {
            const recentTexts = current.slice(0, 6).map((item) => item.text);
            const next = generateActivityItem({
              recentTexts,
              dayKey,
              sequence: nextSequence,
            });
            return [next, ...current].slice(0, 15);
          });
          return nextSequence;
        });
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  const realFeed = useMemo<FakeLiveFeedItem[]>(
    () =>
      (data?.events ?? []).map((event, index) => ({
        id: `real:${event.kind}:${event.createdAt}:${index}`,
        type:
          event.kind === "WITHDRAW"
            ? "withdrawal"
            : event.kind === "TASK"
              ? "campaign"
              : "signup",
        text: event.message,
        createdAt: new Date(event.createdAt).getTime(),
      })),
    [data]
  );

  const mergedFeed = useMemo(
    () => [...realFeed, ...feed].sort((left, right) => right.createdAt - left.createdAt).slice(0, 15),
    [feed, realFeed]
  );

  const withdrawalItems = useMemo(
    () => mergedFeed.filter((item) => item.type === "withdrawal").slice(0, 8),
    [mergedFeed]
  );

  const activityItems = useMemo(
    () => mergedFeed.filter((item) => item.type !== "withdrawal").slice(0, 10),
    [mergedFeed]
  );
  const activityItemsRef = useRef<FakeLiveFeedItem[]>([]);

  useEffect(() => {
    activityItemsRef.current = activityItems;
  }, [activityItems]);

  useEffect(() => {
    if (withdrawalItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setWithdrawIndex((current) => (current + 1) % withdrawalItems.length);
    }, WITHDRAW_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [withdrawalItems]);

  useEffect(() => {
    if (!currentActivityText && activityItems.length > 0) {
      const timer = window.setTimeout(() => {
        setCurrentActivityText(activityItems[0].text);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activityItems, currentActivityText]);

  useEffect(() => {
    if (activityItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setActivityIndex((current) => {
        const nextItems = activityItemsRef.current;
        const nextIndex = (current + 1) % nextItems.length;
        setCurrentActivityText(nextItems[nextIndex]?.text || "");
        return nextIndex;
      });
    }, ACTIVITY_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [ACTIVITY_ROTATION_MS, activityItems.length]);

  const currentWithdrawalText =
    withdrawalItems[withdrawIndex % Math.max(1, withdrawalItems.length)]?.text || t("noLiveWithdraw");
  const activityDisplayText =
    currentActivityText ||
    activityItems[activityIndex % Math.max(1, activityItems.length)]?.text ||
    "No recent activity yet. New events will appear here.";

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
              Live Withdraw Requests ({Math.max(data.stats.liveWithdraws, withdrawalItems.length)})
            </p>
            <div className="rounded-lg border border-white/10 bg-background/60 px-3 py-2 min-h-[52px] flex items-center overflow-hidden whitespace-nowrap">
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
              Activity History
            </p>
            <div className="rounded-lg border border-white/10 bg-background/60 px-3 py-2 min-h-[52px] flex items-center overflow-hidden whitespace-nowrap">
              <div
                key={`activity-${activityIndex}-${activityDisplayText}`}
                className="inline-block min-w-full pr-8 text-sm leading-6 text-emerald-700 dark:text-emerald-200 [animation:marquee_15s_linear_forwards]"
              >
                {activityDisplayText}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
