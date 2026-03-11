import * as React from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "info" | "warning" | "danger";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-400"
      : tone === "info"
        ? "text-cyan-400"
        : tone === "danger"
          ? "text-rose-400"
        : tone === "warning"
          ? "text-amber-400"
          : "text-foreground";

  return (
    <div
      className={cn(
        "premium-ring-hover surface-card rounded-2xl p-4 sm:p-5",
        "flex min-h-[108px] flex-col justify-between",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{label}</p>
      <p className={cn("kpi-value text-2xl font-semibold sm:text-3xl", toneClass)}>{value}</p>
    </div>
  );
}
