"use client";

import MetricCounter from "@/components/metric-counter";
import { cn } from "@/lib/utils";

type HeroFloatsProps = {
  totalPayout: number;
  totalUsers: number;
  tasksCompleted: number;
  businessAccounts: number;
};

function FloatCard({
  title,
  value,
  caption,
  className,
}: {
  title: string;
  value: React.ReactNode;
  caption: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-foreground/10 bg-background/70 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur-none sm:p-4 sm:shadow-[0_12px_30px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 sm:text-[11px]">{title}</p>
      <p className="mt-1.5 text-sm font-semibold text-foreground min-[360px]:text-base sm:text-lg">{value}</p>
      <p className="mt-1 text-[10px] text-foreground/60 min-[360px]:text-[11px] sm:text-xs">{caption}</p>
    </div>
  );
}

export default function HomeHeroFloats({
  totalPayout,
  totalUsers,
  tasksCompleted,
  businessAccounts,
}: HeroFloatsProps) {
  const approvalRate = totalUsers > 0 ? Math.min(99, Math.round((tasksCompleted / totalUsers) * 100)) : 0;
  const growthRate = Math.max(1, Math.round(businessAccounts / 10));

  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
      <div>
        <FloatCard
          title="Wallet"
          value={
            <>
              INR <MetricCounter value={Math.round(totalPayout)} />
            </>
          }
          caption="Total approved payouts"
        />
      </div>
      <div>
        <FloatCard
          title="Approval"
          value={`${approvalRate}% verified`}
          caption="Approval quality"
          className="border-emerald-400/30"
        />
      </div>
      <div>
        <FloatCard
          title="Growth"
          value={`${growthRate}x`}
          caption="Business momentum"
          className="border-sky-400/30"
        />
      </div>
    </div>
  );
}
