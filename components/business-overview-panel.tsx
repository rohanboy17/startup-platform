"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Megaphone,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { toDateLocale } from "@/lib/date-locale";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";

type OverviewResponse = {
  accessRole: "OWNER" | "EDITOR" | "VIEWER";
  kycStatus?: string;
  kycVerifiedAt?: string | null;
  wallet: { balance: number; totalFunded: number; totalSpent: number; totalRefund: number };
  lowBalanceThreshold: number;
  lowBalance: boolean;
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  completedCampaigns: number;
  totalJobs: number;
  openJobs: number;
  pendingJobs: number;
  filledJobs: number;
  lockedBudget: number;
  totalBudget: number;
  remainingBudget: number;
  spentBudget: number;
  approvedSubmissions: number;
  pendingReviews: number;
  readyApplicants: number;
  activeApplicants: number;
  scheduledInterviews: number;
  joinedWorkers: number;
  todaySpend: number;
  averageCostPerApproval: number;
  fundingFeeRate: number;
  businessRefundFeeRate: number;
  activityFeed: Array<{
    id: string;
    kind: "CAMPAIGN" | "APPROVAL" | "WALLET" | "JOB" | "APPLICATION";
    message: string;
    createdAt: string;
  }>;
  error?: string;
};

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export default function BusinessOverviewPanel() {
  const t = useTranslations("business.overviewPanel");
  const locale = useLocale();
  const dateLocale = toDateLocale(locale);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");

  function relativeTimeLabel(value: string) {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

    if (diffMinutes < 60) return t("time.minutesAgo", { count: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t("time.hoursAgo", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t("time.daysAgo", { count: diffDays });
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/business/overview", { credentials: "include" });
    const raw = await res.text();
    let parsed: OverviewResponse = {
      wallet: { balance: 0, totalFunded: 0, totalSpent: 0, totalRefund: 0 },
      accessRole: "OWNER",
      kycStatus: "PENDING",
      kycVerifiedAt: null,
      lowBalanceThreshold: 500,
      lowBalance: false,
      totalCampaigns: 0,
      liveCampaigns: 0,
      pendingCampaigns: 0,
      completedCampaigns: 0,
      totalJobs: 0,
      openJobs: 0,
      pendingJobs: 0,
      filledJobs: 0,
      lockedBudget: 0,
      totalBudget: 0,
      remainingBudget: 0,
      spentBudget: 0,
      approvedSubmissions: 0,
      pendingReviews: 0,
      readyApplicants: 0,
      activeApplicants: 0,
      scheduledInterviews: 0,
      joinedWorkers: 0,
      todaySpend: 0,
      averageCostPerApproval: 0,
      fundingFeeRate: 0,
      businessRefundFeeRate: 0.03,
      activityFeed: [],
    };
    try {
      parsed = raw ? (JSON.parse(raw) as OverviewResponse) : parsed;
    } catch {
      setError(t("errors.unexpectedServerResponse"));
      return;
    }
    if (!res.ok) {
      setError(parsed.error || t("errors.failedToLoadOverview"));
      return;
    }
    setError("");
    setData(parsed);
  }, [t]);

  useLiveRefresh(load, 10000);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  const deploymentRate = percentage(data.spentBudget, data.totalBudget);
  const liveCampaignRate = percentage(data.liveCampaigns, data.totalCampaigns);
  const canManageBilling = data.accessRole === "OWNER";
  const canManageCampaigns = data.accessRole === "OWNER" || data.accessRole === "EDITOR";
  const kycStatus = data.kycStatus || "PENDING";
  const kycTone = kycStatus === "VERIFIED" ? "success" : kycStatus === "REJECTED" ? "danger" : "warning";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canManageBilling ? (
            <Link
              href="/dashboard/business/funding"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-400/20 dark:text-emerald-100 sm:w-auto"
            >
              <Wallet size={16} />
              {t("actions.addFunds")}
            </Link>
          ) : null}
          {canManageCampaigns ? (
            <Link
              href="/dashboard/business/create"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.04] px-4 py-2 text-sm font-medium text-foreground/85 transition hover:bg-foreground/10 sm:w-auto"
            >
              <Megaphone size={16} />
              {t("actions.createCampaign")}
            </Link>
          ) : null}
          {canManageCampaigns ? (
            <Link
              href="/dashboard/business/jobs/create"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-400/20 dark:text-sky-100 sm:w-auto"
            >
              <BriefcaseBusiness size={16} />
              {t("actions.createJob")}
            </Link>
          ) : null}
        </div>
      </div>

      {data.lowBalance ? (
        <SectionCard className="border-amber-400/20 bg-amber-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-700 dark:text-amber-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">{t("lowBalance.title")}</p>
                <p className="text-sm text-amber-800/85 dark:text-amber-100/75">
                  {t("lowBalance.body", { threshold: formatMoney(data.lowBalanceThreshold) })}
                </p>
              </div>
            </div>
            {canManageBilling ? (
              <Link
                href="/dashboard/business/funding"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-background/50 px-4 py-2 text-sm text-amber-900 transition hover:bg-background/70 dark:border-amber-200/20 dark:bg-black/20 dark:text-amber-50"
              >
                {t("lowBalance.cta")}
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.availableWallet")} value={`INR ${formatMoney(data.wallet.balance)}`} tone="success" className="min-h-[132px]" />
        <KpiCard label={t("kpis.lockedBudget")} value={`INR ${formatMoney(data.lockedBudget)}`} tone="info" className="min-h-[132px]" />
        <KpiCard label={t("kpis.liveCampaigns")} value={data.liveCampaigns} className="min-h-[132px]" />
        <KpiCard label={t("kpis.openJobs")} value={data.openJobs} tone="info" className="min-h-[132px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.pendingCampaignReviews")} value={data.pendingCampaigns} tone="warning" className="min-h-[132px]" />
        <KpiCard label={t("kpis.pendingJobReviews")} value={data.pendingJobs} tone="warning" className="min-h-[132px]" />
        <KpiCard label={t("kpis.readyApplicants")} value={data.readyApplicants} tone="success" className="min-h-[132px]" />
        <KpiCard label={t("kpis.approvedResults")} value={data.approvedSubmissions} tone="warning" className="min-h-[132px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpis.totalBudget")} value={`INR ${formatMoney(data.totalBudget)}`} className="min-h-[132px]" />
        <KpiCard label={t("kpis.todaySpend")} value={`INR ${formatMoney(data.todaySpend)}`} tone="success" className="min-h-[132px]" />
        <KpiCard label={t("kpis.fundingFee")} value={`${(data.fundingFeeRate * 100).toFixed(2)}%`} className="min-h-[132px]" />
        <div className="surface-card premium-ring-hover flex min-h-[132px] flex-col justify-between rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{t("kpis.kycStatus")}</p>
          <div className="flex items-center justify-between gap-3">
            <StatusBadge label={kycStatus} tone={kycTone} />
            <CircleDollarSign size={18} className="text-foreground/60" />
          </div>
          <p className="text-xs text-foreground/55">
            {data.kycVerifiedAt
              ? t("kpis.kycVerifiedOn", {
                  date: new Date(data.kycVerifiedAt).toLocaleDateString(dateLocale),
                })
              : t("kpis.kycNotVerified")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 backdrop-blur-md">
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">{t("snapshot.eyebrow")}</p>
                <h3 className="text-xl font-semibold text-foreground">{t("snapshot.title")}</h3>
              </div>
              <Link href="/dashboard/business/analytics" className="text-sm text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100">
                {t("snapshot.openAnalytics")}
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:items-stretch">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("snapshot.todaySpend.label")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">INR {formatMoney(data.todaySpend)}</p>
                  <p className="mt-1 text-xs text-foreground/55">{t("snapshot.todaySpend.help")}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("snapshot.spentSoFar.label")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">INR {formatMoney(data.spentBudget)}</p>
                  <p className="mt-1 text-xs text-foreground/55">{t("snapshot.spentSoFar.help")}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("snapshot.readyApplicants.label")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.readyApplicants}</p>
                  <p className="mt-1 text-xs text-foreground/55">{t("snapshot.readyApplicants.help")}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">{t("snapshot.joinedWorkers.label")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.joinedWorkers}</p>
                  <p className="mt-1 text-xs text-foreground/55">{t("snapshot.joinedWorkers.help")}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/12 via-background/80 to-sky-500/10 p-4 shadow-[0_24px_80px_-44px_rgba(16,185,129,0.4)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-200/70">{t("snapshot.launchModel")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{t("snapshot.launchTitle")}</p>
                    <p className="mt-2 max-w-xl text-sm text-foreground/65">{t("snapshot.launchBody")}</p>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                    {t("snapshot.launchChip")}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                      <span>{t("snapshot.budgetDeployment.label")}</span>
                      <span>{deploymentRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/10">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${deploymentRate}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-foreground/55">
                      {t("snapshot.budgetDeployment.help", {
                        spent: formatMoney(data.spentBudget),
                        total: formatMoney(data.totalBudget),
                      })}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                      <span>{t("snapshot.liveCampaignShare.label")}</span>
                      <span>{liveCampaignRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/10">
                      <div className="h-2 rounded-full bg-sky-400" style={{ width: `${liveCampaignRate}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-foreground/55">
                      {t("snapshot.liveCampaignShare.help", {
                        live: data.liveCampaigns,
                        total: data.totalCampaigns,
                      })}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("snapshot.jobsOpen")}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{data.openJobs}</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("snapshot.interviews")}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{data.scheduledInterviews}</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-foreground/50">{t("snapshot.activeApplicants")}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{data.activeApplicants}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 backdrop-blur-md">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">{t("activity.eyebrow")}</p>
                <h3 className="text-xl font-semibold text-foreground">{t("activity.title")}</h3>
              </div>
              <Link href="/dashboard/business/activity" className="text-sm text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100">
                {t("activity.viewActivity")}
              </Link>
            </div>

            {data.activityFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/60">
                {t("activity.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {data.activityFeed.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <p className="break-words text-sm font-medium text-foreground/90">{item.message}</p>
                      <span className="shrink-0 text-xs text-foreground/45">{relativeTimeLabel(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-foreground/35">{item.kind}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
