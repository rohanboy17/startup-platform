"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, Timer, ArrowUpRight } from "lucide-react";

type HomeHeroTextProps = {
  title: string;
  subtitle: string;
  avgApprovalTimeLabel: string;
};

export default function HomeHeroText({ title, subtitle, avgApprovalTimeLabel }: HomeHeroTextProps) {
  return (
    <div className="space-y-5 sm:space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[20ch] text-balance text-2xl font-bold leading-tight min-[360px]:text-3xl sm:max-w-none sm:text-4xl md:text-6xl whitespace-pre-line"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        className="max-w-[44ch] text-pretty text-sm text-foreground/70 min-[360px]:text-base md:max-w-2xl md:text-lg"
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4"
      >
        <Link
          href="/register"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:scale-105 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
        >
          Start Earning <ArrowRight size={16} />
        </Link>
        <Link
          href="/login"
          className="w-full rounded-full border border-foreground/25 px-5 py-2.5 text-center text-sm text-foreground/90 transition hover:bg-foreground/10 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
        >
          Create Campaign
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/60 sm:gap-3 sm:text-xs"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <CheckCircle2 size={14} />
          Secure approvals
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <ShieldCheck size={14} />
          Manual fraud checks
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <Timer size={14} />
          Avg approval: {avgApprovalTimeLabel}
        </span>
        <span className="inline-flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-foreground/15 bg-background/70 px-3 py-1.5 text-xs text-foreground/70 sm:w-auto sm:flex-nowrap sm:gap-3 sm:rounded-full sm:py-1">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Payouts protected
          </span>
          <Link href="/dashboard" className="flex items-center gap-1 text-foreground transition hover:opacity-80">
            View dashboard
            <ArrowUpRight size={14} />
          </Link>
        </span>
      </motion.div>
    </div>
  );
}
