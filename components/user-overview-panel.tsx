"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  Gift,
  ListChecks,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/lib/format-money";
import { useLiveRefresh } from "@/lib/live-refresh";
import { useHydrated } from "@/lib/use-hydrated";
import { useLocale, useTranslations } from "next-intl";

type OverviewResponse = {
  profile: {
    displayName: string;
    level: "L1" | "L2" | "L3" | "L4" | "L5";
    balance: number;
    coinBalance: number;
    perkCreditBalance: number;
    dailyApproved: number;
    totalApproved: number;
    dailySubmits: number;
  };
  metrics: {
    availableBalance: number;
    coinBalance: number;
    perkCreditBalance: number;
    pendingWithdrawalAmount: number;
    totalWithdrawn: number;
    approvedSubmissions: number;
    todayApprovedCount: number;
    activeJobApplications: number;
    unreadNotifications: number;
  };
  progress: {
    current: number;
    target: number | null;
    percent: number;
  };
  levelBenefits: Array<{
    level: "L1" | "L2" | "L3" | "L4" | "L5";
    minApproved: number;
    maxApproved: number | null;
    commissionRate: number;
    walletShareRate: number;
    isCurrent: boolean;
  }>;
  levelSystem: {
    currentLevel: "L1" | "L2" | "L3" | "L4" | "L5";
    marketingShareRate: number;
    fixedWorkShareRate: number;
    physicalWorkShareRate: number;
  };
  experience?: {
    totalWorkDays: number;
    digitalWorkDays: number;
    physicalWorkDays: number;
    approvedTaskCount: number;
    joinedJobsCount: number;
    activeSince: string | null;
    experienceLabel: string;
  } | null;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    kind: string;
    message: string;
    createdAt: string;
  }>;
  error?: string;
};

function intlLocale(locale: string) {
  if (locale === "hi") return "hi-IN";
  if (locale === "bn") return "bn-IN";
  return "en-IN";
}

function relativeTimeLabel(locale: string, value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "always", style: "short" });

  if (diffMinutes < 60) return rtf.format(-diffMinutes, "minute");
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  const diffDays = Math.floor(diffHours / 24);
  return rtf.format(-diffDays, "day");
}

export default function UserOverviewPanel() {
  const t = useTranslations("user.overview");
  const locale = useLocale();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");
  const hydrated = useHydrated();

  const quickLinks = useMemo(
    () => [
      {
        href: "/dashboard/user/tasks",
        title: t("openTasks"),
        description: t("openTasksDesc"),
        Icon: ListChecks,
        iconClassName: "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
      },
      {
        href: "/dashboard/user/jobs",
        title: t("openJobs"),
        description: t("openJobsDesc"),
        Icon: BriefcaseBusiness,
        iconClassName: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-200",
      },
      {
        href: "/dashboard/user/job-applications",
        title: t("openJobApplications"),
        description: t("openJobApplicationsDesc"),
        Icon: ClipboardList,
        iconClassName: "border-violet-400/25 bg-violet-400/10 text-violet-700 dark:text-violet-200",
      },
      {
        href: "/dashboard/user/wallet",
        title: t("openWallet"),
        description: t("openWalletDesc"),
        Icon: Wallet,
        iconClassName: "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-200",
      },
      {
        href: "/dashboard/user/notifications",
        title: t("openNotifications"),
        description: t("openNotificationsDesc"),
        Icon: Bell,
        iconClassName: "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-200",
      },
      {
        href: "/dashboard/user/referrals",
        title: t("openReferrals"),
        description: t("openReferralsDesc"),
        Icon: Gift,
        iconClassName: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-700 dark:text-fuchsia-200",
      },
    ],
    [t]
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/v2/users/me/overview", { credentials: "include" });
    const raw = await res.text();
    let parsed: OverviewResponse | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as OverviewResponse) : null;
    } catch {
      setError(t("unexpected"));
      return;
    }

    if (!res.ok) {
      setError(parsed?.error || t("failed"));
      return;
    }

    setError("");
    setData(parsed);
  }, [t]);

  useLiveRefresh(load, 45000);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-foreground/60">{t("loading")}</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65 md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/user/tasks"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-400/20 dark:text-emerald-100 sm:w-auto"
          >
            <Sparkles size={16} />
            {t("ctaTasks")}
          </Link>
          <Link
            href="/dashboard/user/jobs"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-400/20 dark:text-sky-100 sm:w-auto"
          >
            <BriefcaseBusiness size={16} />
            {t("ctaJobs")}
          </Link>
          <Link
            href="/dashboard/user/withdrawals"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.04] px-4 py-2 text-sm font-medium text-foreground/85 transition hover:bg-foreground/10 sm:w-auto"
          >
            <Wallet size={16} />
            {t("ctaWithdraw")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-8">
        <KpiCard
          label={t("kpiAvailable")}
          value={`INR ${formatMoney(data.metrics.availableBalance)}`}
          tone="success"
        />

        <KpiCard
          label={t("kpiCoins")}
          value={data.metrics.coinBalance}
          tone="info"
        />

        <KpiCard
          label={t("kpiPerkCredits")}
          value={data.metrics.perkCreditBalance}
          tone="success"
        />

        <KpiCard
          label={t("kpiPendingWithdrawal")}
          value={`INR ${formatMoney(data.metrics.pendingWithdrawalAmount)}`}
          tone="warning"
        />

        <KpiCard
          label={t("kpiTotalWithdrawn")}
          value={`INR ${formatMoney(data.metrics.totalWithdrawn)}`}
          tone="info"
        />

        <KpiCard
          label={t("kpiApprovedSubmissions")}
          value={data.metrics.approvedSubmissions}
        />

        <KpiCard
          label={t("kpiActiveApplications")}
          value={data.metrics.activeJobApplications}
          tone="warning"
        />

        <KpiCard
          label={t("kpiCurrentLevel")}
          value={data.profile.level}
          tone="info"
        />

        <KpiCard
          label={t("kpiUnread")}
          value={data.metrics.unreadNotifications}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 min-[1600px]:grid-cols-[1.1fr_0.9fr]">
        <SectionCard elevated className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-foreground/60">{t("levelEyebrow")}</p>
                <h3 className="text-xl font-semibold text-foreground">{t("levelTitle")}</h3>
                <p className="mt-1 text-sm text-foreground/65">{t("levelGuideSubtitle")}</p>
              </div>
              <Link href="/dashboard/user/submissions" className="text-sm text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-emerald-100">
                {t("viewSubmissions")}
              </Link>
            </div>

            <div className="grid gap-4 min-[1400px]:grid-cols-[1fr_auto] min-[1400px]:items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("levelNow")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.profile.level}</p>
                  <p className="mt-1 text-sm text-foreground/65">
                    {data.progress.target === null
                      ? t("topTierUnlocked", { count: data.progress.current })
                      : t("progressSoFar", { current: data.progress.current, target: data.progress.target })}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-foreground/70">
                    <span>{t("progressToNext")}</span>
                    <span>{data.progress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/10">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${data.progress.percent}%` }} />
                  </div>
                </div>
              </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("todayApproved")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.profile.dailyApproved}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("totalApproved")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.profile.totalApproved}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("submittedToday")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{data.profile.dailySubmits}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/80 dark:text-emerald-200/75">
                {t("levelBenefitsEyebrow")}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-foreground">{t("levelBenefitsTitle")}</h4>
              <p className="mt-2 text-sm text-foreground/70">
                {t("levelBenefitsBody", {
                  marketing: Math.round(data.levelSystem.marketingShareRate * 100),
                  work: Math.round(data.levelSystem.fixedWorkShareRate * 100),
                })}
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
                {data.levelBenefits.map((item) => (
                  <div
                    key={item.level}
                    className={`rounded-2xl border p-4 transition ${
                      item.isCurrent
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : "border-foreground/10 bg-background/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-foreground">{item.level}</p>
                      {item.isCurrent ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                          {t("currentBadge")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground/65">
                      {item.maxApproved === null
                        ? t("levelRangeOpen", { min: item.minApproved })
                        : t("levelRange", { min: item.minApproved, max: item.maxApproved })}
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-foreground">
                      {Math.round(item.walletShareRate * 100)}%
                    </p>
                    <p className="mt-1 text-sm text-foreground/70">
                      {t("walletShare", { percent: Math.round(item.walletShareRate * 100) })}
                    </p>
                    <p className="mt-2 text-xs text-foreground/55">
                      {t("commissionCut", { percent: Math.round(item.commissionRate * 100) })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80 dark:text-sky-200/75">
                {t("workCommissionEyebrow")}
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">{t("workCommissionTitle")}</h4>
                  <p className="mt-2 max-w-2xl text-sm text-foreground/70">
                    {t("workCommissionBody", {
                      percent: Math.round(data.levelSystem.fixedWorkShareRate * 100),
                    })}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-400/25 bg-background/70 px-4 py-3 sm:min-w-48">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">
                    {t("workCommissionWalletShare")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {Math.round(data.levelSystem.fixedWorkShareRate * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">
                    {t("workCommissionPlatformCut", {
                      percent: Math.round((1 - data.levelSystem.fixedWorkShareRate) * 100),
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-violet-700/80 dark:text-violet-200/75">
                {t("physicalCommissionEyebrow")}
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">{t("physicalCommissionTitle")}</h4>
                  <p className="mt-2 max-w-2xl text-sm text-foreground/70">
                    {t("physicalCommissionBody", {
                      percent: Math.round(data.levelSystem.physicalWorkShareRate * 100),
                    })}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-400/25 bg-background/70 px-4 py-3 sm:min-w-48">
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">
                    {t("physicalCommissionWalletShare")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {Math.round(data.levelSystem.physicalWorkShareRate * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">
                    {t("physicalCommissionPlatformCut", {
                      percent: Math.round((1 - data.levelSystem.physicalWorkShareRate) * 100),
                    })}
                  </p>
                </div>
              </div>
            </div>

            {data.experience ? (
              <div className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">{t("experienceEyebrow")}</p>
                <h4 className="mt-2 text-lg font-semibold text-foreground">{t("experienceTitle")}</h4>
                <p className="mt-2 text-sm text-foreground/70">
                  {t("experienceBody", {
                    label: data.experience.experienceLabel,
                    days: data.experience.totalWorkDays,
                    digital: data.experience.digitalWorkDays,
                    physical: data.experience.physicalWorkDays,
                  })}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {quickLinks.map(({ href, title, description, Icon, iconClassName }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl border border-foreground/10 bg-background/60 p-4 transition hover:border-foreground/20 hover:bg-background/80"
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${iconClassName}`}>
                    <Icon size={18} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-foreground/70">{description}</p>
                </Link>
              ))}
            </div>
        </SectionCard>

        <div className="space-y-6">
          <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/60">{t("recentNotifications")}</p>
                  <h3 className="text-xl font-semibold text-foreground">{t("attentionTitle")}</h3>
                </div>
                <Link href="/dashboard/user/notifications" className="text-sm text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-emerald-100">
                  {t("openInbox")}
                </Link>
              </div>

              {data.recentNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                  {t("noNotifications")}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentNotifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-foreground break-words">{item.title}</p>
                        <span className="shrink-0 text-xs text-foreground/60" suppressHydrationWarning>
                          {hydrated ? relativeTimeLabel(locale, item.createdAt) : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/75 break-words">{item.message}</p>
                      {!item.isRead ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                          {t("unread")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-foreground/10 bg-background/50 shadow-xl shadow-black/10 dark:shadow-black/20 backdrop-blur-md">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/60">{t("recentActivity")}</p>
                  <h3 className="text-xl font-semibold text-foreground">{t("activityTitle")}</h3>
                </div>
                <Link href="/dashboard/user/wallet" className="text-sm text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-emerald-100">
                  {t("walletDetails")}
                </Link>
              </div>

              {data.recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.03] p-6 text-sm text-foreground/70">
                  {t("noActivity")}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-foreground/10 bg-background/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-sm font-medium text-foreground/90 break-words">{item.message}</p>
                        <span className="shrink-0 text-xs text-foreground/60" suppressHydrationWarning>
                          {hydrated ? relativeTimeLabel(locale, item.createdAt) : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-foreground/60">{item.kind}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
