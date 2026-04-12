"use client";

import { BriefcaseBusiness, Timer, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import MetricCounter from "@/components/metric-counter";
import { cn } from "@/lib/utils";

type HeroFloatsProps = {
  totalJobs: number;
  totalJobApplications: number;
  activeHiring: number;
};

function FloatCard({
  title,
  value,
  caption,
  icon,
  className,
}: {
  title: string;
  value: React.ReactNode;
  caption: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-foreground/10 bg-background/70 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur-none sm:p-4 sm:shadow-[0_12px_30px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 sm:text-[11px]">{title}</p>
        {icon ? (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/[0.04] text-foreground/70">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-foreground min-[360px]:text-base sm:text-lg">{value}</p>
      <p className="mt-1 text-[10px] text-foreground/60 min-[360px]:text-[11px] sm:text-xs">{caption}</p>
    </div>
  );
}

export default function HomeHeroFloats({
  totalJobs,
  totalJobApplications,
  activeHiring,
}: HeroFloatsProps) {
  const t = useTranslations("home.heroMetrics");

  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
      <div>
        <FloatCard
          title={t("totalJobs.title")}
          value={<MetricCounter value={totalJobs} />}
          caption={t("totalJobs.caption")}
          icon={<BriefcaseBusiness size={18} />}
        />
      </div>
      <div>
        <FloatCard
          title={t("applications.title")}
          value={<MetricCounter value={totalJobApplications} />}
          caption={t("applications.caption")}
          icon={<Users size={18} />}
          className="border-emerald-400/30"
        />
      </div>
      <div>
        <FloatCard
          title={t("activeHiring.title")}
          value={<MetricCounter value={activeHiring} />}
          caption={t("activeHiring.caption")}
          icon={<Timer size={18} />}
          className="border-sky-400/30"
        />
      </div>
    </div>
  );
}
