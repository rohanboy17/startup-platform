"use client";

import { BriefcaseBusiness, Timer, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import MetricCounter from "@/components/metric-counter";
import { KpiCard } from "@/components/ui/kpi-card";

type HeroFloatsProps = {
  totalJobs: number;
  totalJobApplications: number;
  activeHiring: number;
};

export default function HomeHeroFloats({
  totalJobs,
  totalJobApplications,
  activeHiring,
}: HeroFloatsProps) {
  const t = useTranslations("home.heroMetrics");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label={t("totalJobs.title")}
        value={<MetricCounter value={totalJobs} />}
        caption={t("totalJobs.caption")}
        icon={<BriefcaseBusiness size={18} />}
      />
      <KpiCard
        label={t("applications.title")}
        value={<MetricCounter value={totalJobApplications} />}
        caption={t("applications.caption")}
        icon={<Users size={18} />}
        tone="success"
      />
      <KpiCard
        label={t("activeHiring.title")}
        value={<MetricCounter value={activeHiring} />}
        caption={t("activeHiring.caption")}
        icon={<Timer size={18} />}
        tone="info"
      />
    </div>
  );
}
