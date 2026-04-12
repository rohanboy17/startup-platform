import * as React from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon,
  caption,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  caption?: string;
  tone?: "default" | "success" | "info" | "warning" | "danger";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "info"
        ? "text-cyan-600 dark:text-cyan-400"
        : tone === "danger"
          ? "text-rose-600 dark:text-rose-400"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground";

  return (
    <div
      className={cn(
        "premium-ring-hover surface-card rounded-2xl p-4 sm:p-5",
        "flex min-h-[118px] flex-col",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-h-[2rem] line-clamp-2 text-xs font-medium uppercase tracking-wide text-foreground/60">{label}</p>
        {icon ? (
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/[0.04]",
              toneClass
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-1.5">
        <p className={cn("kpi-value text-2xl font-semibold sm:text-3xl", toneClass)}>{value}</p>
        {caption ? <p className="text-xs leading-5 text-foreground/58">{caption}</p> : null}
      </div>
    </div>
  );
}
