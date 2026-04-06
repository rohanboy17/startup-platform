"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, Timer, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

type HomeHeroTextProps = {
  title: string;
  subtitle: string;
  avgApprovalTimeLabel: string;
};

export default function HomeHeroText({ title, subtitle, avgApprovalTimeLabel }: HomeHeroTextProps) {
  const t = useTranslations("home.hero");
  const reduceMotion = useReducedMotion();
  return (
    <div className="space-y-5 sm:space-y-8">
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="max-w-[20ch] text-balance text-2xl font-bold leading-tight min-[360px]:text-3xl sm:max-w-none sm:text-4xl md:text-6xl whitespace-pre-line"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
        className="max-w-[44ch] text-pretty text-sm text-foreground/70 min-[360px]:text-base md:max-w-2xl md:text-lg"
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4"
      >
        <Link
          href="/register"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:scale-105 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
        >
          {t("startEarning")} <ArrowRight size={16} />
        </Link>
        <Link
          href="/login"
          className="w-full rounded-full border border-foreground/25 px-5 py-2.5 text-center text-sm text-foreground/90 transition hover:bg-foreground/10 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
        >
          {t("createCampaign")}
        </Link>
        <span className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-foreground/25 bg-background/70 px-5 py-2.5 text-sm text-foreground/90 transition hover:bg-foreground/10 sm:w-auto sm:px-6 sm:py-3 sm:text-base">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <CheckCircle2 size={16} className="text-emerald-500" />
            {t("payoutsProtected")}
          </span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 whitespace-nowrap font-medium text-foreground transition hover:opacity-80"
          >
            {t("viewDashboard")}
            <ArrowUpRight size={16} />
          </Link>
        </span>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
        className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/60 sm:gap-3 sm:text-xs"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <CheckCircle2 size={14} />
          {t("secureApprovals")}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <ShieldCheck size={14} />
          {t("manualFraud")}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
          <Timer size={14} />
          {t("avgApproval", { time: avgApprovalTimeLabel })}
        </span>
      </motion.div>
    </div>
  );
}
