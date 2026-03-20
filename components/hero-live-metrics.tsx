"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MetricCounter from "@/components/metric-counter";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { mergeMetricMaximums } from "@/lib/display-metrics";

export default function HeroLiveMetrics({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("home.live");
  const [stats, setStats] = useState({
    activeOnlineUsers: 0,
    activeOnlineBusinesses: 0,
    liveTasks: 0,
    liveWithdraws: 0,
  });
  const [error, setError] = useState("");
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasIntersected) return;
    let timer: NodeJS.Timeout | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/public/live");
        const raw = await res.text();
        const parsed = raw ? (JSON.parse(raw) as { stats?: typeof stats; error?: string }) : {};
        if (!res.ok) {
          setError(parsed.error || t("statsError"));
          return;
        }
        setError("");
        if (parsed.stats) setStats((current) => mergeMetricMaximums(current, parsed.stats!));
      } catch {
        setError(t("statsError"));
      }
    };

    load();
    timer = setInterval(load, 15000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasIntersected, t]);

  const cards = useMemo(
    () => [
      { label: t("activeUsersLabel"), value: stats.activeOnlineUsers, tone: "text-emerald-300" },
      { label: t("activeBusinessesLabel"), value: stats.activeOnlineBusinesses, tone: "text-sky-300" },
      { label: t("liveCampaignsLabel"), value: stats.liveTasks, tone: "text-violet-300" },
      { label: t("liveWithdrawalsLabel"), value: stats.liveWithdraws, tone: "text-amber-300" },
    ],
    [stats, t]
  );

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}

      <div
        className={cn(
          "grid w-full grid-cols-2 gap-3 max-[420px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4",
          compact && "gap-3"
        )}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "flex h-[96px] w-full flex-col items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 backdrop-blur-none text-center transition hover:bg-foreground/10 sm:h-[120px] sm:backdrop-blur-sm",
              compact && "h-[88px] sm:h-[104px]"
            )}
          >
            <p className="text-[11px] uppercase tracking-widest text-foreground/60">
              {card.label}
            </p>

            <p
              className={cn(
                "mt-2 text-2xl font-bold leading-none sm:text-3xl",
                card.tone,
                compact && "text-2xl"
              )}
            >
              {hasIntersected ? <MetricCounter value={card.value} /> : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
