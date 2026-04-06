"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

export type HeroStats = {
  totalUsers: number;
  businessAccounts: number;
  tasksCompleted: number;
  totalPayout: number;
};

export default function HomeHeroVisual({ stats }: { stats: HeroStats }) {
  const reduceMotion = useReducedMotion();
  const approvalRate =
    stats.totalUsers > 0 ? Math.min(99, Math.round((stats.tasksCompleted / stats.totalUsers) * 100)) : 0;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative mx-auto flex w-full min-w-0 flex-col items-center gap-4 pb-6"
    >
      <div className="relative w-full min-w-0 rounded-[28px] border border-foreground/10 bg-foreground/5 p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:rounded-[32px] sm:p-6">
        <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-2.5 py-1 text-[11px] text-foreground/70 sm:right-5 sm:top-5 sm:px-3 sm:text-xs">
          <Sparkles size={14} className="text-emerald-500" />
          Live insights
        </div>
        <p className="pr-24 text-[11px] uppercase tracking-[0.18em] text-foreground/50 sm:pr-0 sm:text-xs">Campaign flow</p>
        <h3 className="mt-2 pr-24 text-xl font-semibold sm:mt-3 sm:pr-0 sm:text-2xl">Weekly momentum</h3>
        <div className="mt-5 grid gap-3 sm:mt-6">
          <div className="rounded-2xl border border-foreground/10 bg-background/70 p-4">
            <div className="flex items-center justify-between text-xs text-foreground/50">
              <span>Approvals</span>
              <span className="text-emerald-500">{approvalRate}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-foreground/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                style={{ width: `${Math.min(90, Math.max(10, approvalRate))}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background/70 p-4">
            <div className="flex items-center justify-between text-xs text-foreground/50">
              <span>Budget usage</span>
              <span className="text-sky-500">
                {stats.totalUsers > 0
                  ? Math.min(90, Math.round((stats.tasksCompleted / Math.max(1, stats.totalUsers)) * 60))
                  : 0}
                %
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-foreground/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                style={{
                  width: `${
                    stats.totalUsers > 0
                      ? Math.min(80, Math.max(15, Math.round((stats.tasksCompleted / Math.max(1, stats.totalUsers)) * 50)))
                      : 20
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
