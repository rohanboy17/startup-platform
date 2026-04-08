"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import HomeHeroFloats from "@/components/home-hero-floats";
import MotionSection from "@/components/motion-section";
import MetricCounter from "@/components/metric-counter";
import { MotionItem, MotionStagger } from "@/components/motion-stagger";
import { SectionCard } from "@/components/ui/section-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { useLiveRefresh } from "@/lib/live-refresh";
import { mergeMetricMaximums } from "@/lib/display-metrics";

type HeroMetrics = {
  totalPayout: number;
  totalUsers: number;
  businessAccounts: number;
  totalCampaigns: number;
  tasksCompleted: number;
};

export default function HomeLiveFloatsAndStats({
  initial,
  showStats,
}: {
  initial: HeroMetrics;
  showStats: boolean;
}) {
  const t = useTranslations("home.stats");
  const [metrics, setMetrics] = useState<HeroMetrics>(initial);

  const load = useCallback(async () => {
    const res = await fetch("/api/public/hero-metrics", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as HeroMetrics;
    setMetrics((current) => mergeMetricMaximums(current, data));
  }, []);

  useLiveRefresh(load, 30000);

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
                  label={t("totalPayout")}
                  value={<MetricCounter value={metrics.totalPayout} formatter="inr" />}
                  tone="success"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard label={t("tasksCompleted")} value={<MetricCounter value={metrics.tasksCompleted} />} />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label={t("campaignsCompleted")}
                  value={<MetricCounter value={metrics.totalCampaigns} />}
                  tone="info"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard label={t("businessAccounts")} value={<MetricCounter value={metrics.businessAccounts} />} />
              </MotionItem>

              <MotionItem>
                <KpiCard label={t("totalUsers")} value={<MetricCounter value={metrics.totalUsers} />} />
              </MotionItem>
            </MotionStagger>
          </SectionCard>
        </MotionSection>
      ) : null}
    </>
  );
}
