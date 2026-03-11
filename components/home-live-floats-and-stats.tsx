"use client";

import { useCallback, useState } from "react";
import HomeHeroFloats from "@/components/home-hero-floats";
import MotionSection from "@/components/motion-section";
import MetricCounter from "@/components/metric-counter";
import { MotionItem, MotionStagger } from "@/components/motion-stagger";
import { SectionCard } from "@/components/ui/section-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { useLiveRefresh } from "@/lib/live-refresh";

type HeroMetrics = {
  totalPayout: number;
  totalUsers: number;
  businessAccounts: number;
  activeCampaigns: number;
  tasksCompleted: number;
};

export default function HomeLiveFloatsAndStats({
  initial,
  showStats,
}: {
  initial: HeroMetrics;
  showStats: boolean;
}) {
  const [metrics, setMetrics] = useState<HeroMetrics>(initial);

  const load = useCallback(async () => {
    const res = await fetch("/api/public/hero-metrics", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as HeroMetrics;
    setMetrics(data);
  }, []);

  useLiveRefresh(load, 10000);

  return (
    <>
      <div className="mt-6 sm:mt-8">
        <HomeHeroFloats
          totalPayout={metrics.totalPayout}
          totalUsers={metrics.totalUsers}
          tasksCompleted={metrics.tasksCompleted}
          businessAccounts={metrics.businessAccounts}
        />
      </div>
      {showStats ? (
        <MotionSection className="mt-8 w-full sm:mt-10" delay={0.1}>
          <SectionCard elevated>
            <MotionStagger className="grid w-full grid-cols-2 gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-5">
              <MotionItem>
                <KpiCard
                  label="Total Platform Payout"
                  value={<MetricCounter value={metrics.totalPayout} formatter="inr" />}
                  tone="success"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard label="Tasks Completed" value={<MetricCounter value={metrics.tasksCompleted} />} />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label="Active Campaigns"
                  value={<MetricCounter value={metrics.activeCampaigns} />}
                  tone="info"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard label="Business Accounts" value={<MetricCounter value={metrics.businessAccounts} />} />
              </MotionItem>

              <MotionItem>
                <KpiCard label="Total Users" value={<MetricCounter value={metrics.totalUsers} />} />
              </MotionItem>
            </MotionStagger>
          </SectionCard>
        </MotionSection>
      ) : null}
    </>
  );
}

