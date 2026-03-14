import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneMap: Record<StatusTone, string> = {
  neutral: "border-foreground/20 bg-foreground/10 text-foreground/80",
  success: "border-emerald-400/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-400/35 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "border-rose-400/35 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  info: "border-cyan-400/35 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        toneMap[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
