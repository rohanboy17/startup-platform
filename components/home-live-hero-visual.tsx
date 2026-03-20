"use client";

import { useCallback, useState } from "react";
import HomeHeroVisual from "@/components/home-hero-visual";
import { useLiveRefresh } from "@/lib/live-refresh";
import { mergeMetricMaximums } from "@/lib/display-metrics";

type HeroMetrics = {
  totalPayout: number;
  totalUsers: number;
  businessAccounts: number;
  totalCampaigns: number;
  tasksCompleted: number;
};

export default function HomeLiveHeroVisual({ initial }: { initial: HeroMetrics }) {
  const [metrics, setMetrics] = useState<HeroMetrics>(initial);

  const load = useCallback(async () => {
    const res = await fetch("/api/public/hero-metrics", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as HeroMetrics;
    setMetrics((current) => mergeMetricMaximums(current, data));
  }, []);

  useLiveRefresh(load, 10000);

  return (
    <HomeHeroVisual
      stats={{
        totalUsers: metrics.totalUsers,
        businessAccounts: metrics.businessAccounts,
        tasksCompleted: metrics.tasksCompleted,
        totalPayout: metrics.totalPayout,
      }}
    />
  );
}
