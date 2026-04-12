"use client";

import { Building2, CheckCircle2, Megaphone, Users, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
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
  totalCampaigns: number;
  tasksCompleted: number;
  totalJobs: number;
  totalJobApplications: number;
  activeHiring: number;
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
    setMetrics(data);
  }, []);

  useLiveRefresh(load, 30000);

  return (
    <>
      <div className="mt-6 sm:mt-8">
        <HomeHeroFloats
          totalJobs={metrics.totalJobs}
          totalJobApplications={metrics.totalJobApplications}
          activeHiring={metrics.activeHiring}
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
                  icon={<Wallet size={18} />}
                  tone="success"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label={t("tasksCompleted")}
                  value={<MetricCounter value={metrics.tasksCompleted} />}
                  icon={<CheckCircle2 size={18} />}
                />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label={t("campaignsCompleted")}
                  value={<MetricCounter value={metrics.totalCampaigns} />}
                  icon={<Megaphone size={18} />}
                  tone="info"
                />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label={t("businessAccounts")}
                  value={<MetricCounter value={metrics.businessAccounts} />}
                  icon={<Building2 size={18} />}
                />
              </MotionItem>

              <MotionItem>
                <KpiCard
                  label={t("totalUsers")}
                  value={<MetricCounter value={metrics.totalUsers} />}
                  icon={<Users size={18} />}
                />
              </MotionItem>
            </MotionStagger>
          </SectionCard>
        </MotionSection>
      ) : null}
    </>
  );
}
