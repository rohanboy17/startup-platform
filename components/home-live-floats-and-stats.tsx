"use client";

import { BriefcaseBusiness, Building2, CheckCircle2, Megaphone, Timer, Users, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import MobileCarouselShell from "@/components/mobile-carousel-shell";
import MotionSection from "@/components/motion-section";
import MetricCounter from "@/components/metric-counter";
import { MotionItem } from "@/components/motion-stagger";
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
  const tHero = useTranslations("home.heroMetrics");
  const [metrics, setMetrics] = useState<HeroMetrics>(initial);

  const load = useCallback(async () => {
    const res = await fetch("/api/public/hero-metrics", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as HeroMetrics;
    setMetrics(data);
  }, []);

  useLiveRefresh(load, 30000);

  return (
    <MotionSection className="mt-5 w-full sm:mt-6 lg:flex-1" delay={0.1}>
      <SectionCard elevated className="h-full p-4 sm:p-5 lg:p-6">
        <MobileCarouselShell className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
          <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
            <KpiCard
              label={t("totalPayout")}
              value={<MetricCounter value={metrics.totalPayout} formatter="inr" />}
              icon={<Wallet size={18} />}
              tone="success"
            />
          </MotionItem>

          <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
            <KpiCard
              label={tHero("totalJobs.title")}
              value={<MetricCounter value={metrics.totalJobs} />}
              icon={<BriefcaseBusiness size={18} />}
            />
          </MotionItem>

          <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
            <KpiCard
              label={tHero("applications.title")}
              value={<MetricCounter value={metrics.totalJobApplications} />}
              icon={<Users size={18} />}
              tone="success"
            />
          </MotionItem>

          <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
            <KpiCard
              label={tHero("activeHiring.title")}
              value={<MetricCounter value={metrics.activeHiring} />}
              icon={<Timer size={18} />}
              tone="info"
            />
          </MotionItem>

          {showStats ? (
            <>
              <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
                <KpiCard
                  label={t("tasksCompleted")}
                  value={<MetricCounter value={metrics.tasksCompleted} />}
                  icon={<CheckCircle2 size={18} />}
                />
              </MotionItem>

              <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
                <KpiCard
                  label={t("campaignsCompleted")}
                  value={<MetricCounter value={metrics.totalCampaigns} />}
                  icon={<Megaphone size={18} />}
                  tone="info"
                />
              </MotionItem>

              <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
                <KpiCard
                  label={t("businessAccounts")}
                  value={<MetricCounter value={metrics.businessAccounts} />}
                  icon={<Building2 size={18} />}
                />
              </MotionItem>

              <MotionItem className="min-w-[82%] snap-start sm:min-w-[60%] md:min-w-0">
                <KpiCard
                  label={t("totalUsers")}
                  value={<MetricCounter value={metrics.totalUsers} />}
                  icon={<Users size={18} />}
                />
              </MotionItem>
            </>
          ) : null}
        </MobileCarouselShell>
      </SectionCard>
    </MotionSection>
  );
}
