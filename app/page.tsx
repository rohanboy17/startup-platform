"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import HomeLiveSection from "@/components/home-live-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.2),transparent_35%),#050507] text-white">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <p className="text-lg font-semibold tracking-tight">EarnHub</p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105"
          >
            Register
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-6 sm:space-y-8">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold leading-tight sm:text-4xl md:text-6xl"
          >
            Run campaigns.
            <br />
            Reward real users.
            <br />
            Grow with confidence.
          </motion.h1>

          <p className="max-w-2xl text-base text-white/70 md:text-lg">
            EarnHub is a secure two-sided marketplace where users complete verified tasks
            and businesses launch measurable growth campaigns.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-105 sm:px-6 sm:py-3 sm:text-base"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/25 px-5 py-2.5 text-sm text-white/90 transition hover:bg-white/10 sm:px-6 sm:py-3 sm:text-base"
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl sm:p-6">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
              <p className="text-sm text-white/60">Total Platform Payout</p>
              <p className="mt-1 text-2xl font-bold sm:text-3xl">INR 12.4L+</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                <p className="text-sm text-white/60">Tasks Completed</p>
                <p className="mt-1 text-xl font-semibold sm:text-2xl">45,000+</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                <p className="text-sm text-white/60">Business Accounts</p>
                <p className="mt-1 text-xl font-semibold sm:text-2xl">1,900+</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                <p className="text-sm text-white/60">Total Users</p>
                <p className="mt-1 text-xl font-semibold sm:text-2xl">72,000+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 sm:gap-6 sm:px-6 sm:pb-20 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <ShieldCheck className="text-emerald-400" />
          <h3 className="mt-4 text-xl font-semibold">Secure By Design</h3>
          <p className="mt-2 text-white/65">
            Wallet ledger, moderation pipeline, and atomic reward settlement for trust at scale.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <Zap className="text-blue-400" />
          <h3 className="mt-4 text-xl font-semibold">Fast Campaign Launch</h3>
          <p className="mt-2 text-white/65">
            Fund your business wallet, create campaigns, and start receiving submissions in minutes.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <TrendingUp className="text-violet-400" />
          <h3 className="mt-4 text-xl font-semibold">Actionable Growth</h3>
          <p className="mt-2 text-white/65">
            Monitor campaign flow, approvals, and platform revenue from your analytics dashboards.
          </p>
        </div>
      </section>

      <HomeLiveSection />
    </div>
  );
}
