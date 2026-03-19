import { prisma } from "@/lib/prisma";
import DashboardNavbar from "@/components/dashboard-navbar";
import RevenueChart from "@/components/revenue-chart";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTranslations } from "next-intl/server";

export default async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  const now = new Date();
  const staleResetCutoff = new Date(now.getTime() - 26 * 60 * 60 * 1000);
  const staleQueueCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartMonthCount = 6;
  const chartStart = new Date(now.getFullYear(), now.getMonth() - (chartMonthCount - 1), 1);

  const [
    users,
    businesses,
    managers,
    pendingCampaigns,
    pendingFinalReviews,
    liveCampaigns,
    totalSubmissions,
    pendingWithdrawals,
    pendingBusinessKyc,
    suspiciousUsers,
    staleLevelResets,
    failedPayments,
    oldPendingWithdrawals,
    oldPendingAdminReviews,
    earningsForChart,
    payoutsForChart,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "BUSINESS", businessOwnerId: null } }),
    prisma.user.count({ where: { role: "MANAGER" } }),
    prisma.campaign.count({ where: { status: "PENDING" } }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
      },
    }),
    prisma.campaign.count({ where: { status: "LIVE" } }),
    prisma.submission.count({ where: { campaignId: { not: null } } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "BUSINESS", businessOwnerId: null, kycStatus: "PENDING" } }),
    prisma.user.count({ where: { isSuspicious: true } }),
    prisma.user.count({ where: { role: "USER", lastLevelResetAt: { lt: staleResetCutoff } } }),
    prisma.paymentOrder.count({ where: { status: "FAILED" } }),
    prisma.withdrawal.count({
      where: { status: "PENDING", createdAt: { lt: staleQueueCutoff } },
    }),
    prisma.submission.count({
      where: {
        campaignId: { not: null },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
        createdAt: { lt: staleQueueCutoff },
      },
    }),
    prisma.platformEarning.findMany({
      where: {
        createdAt: { gte: chartStart },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.platformPayout.findMany({
      where: {
        createdAt: { gte: chartStart },
        status: "APPROVED",
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const platformEarning = (prisma as unknown as {
    platformEarning?: {
      aggregate: (args: { _sum: { amount: true } }) => Promise<{ _sum: { amount: number | null } }>;
    };
  }).platformEarning;

  const revenue = platformEarning
    ? await platformEarning.aggregate({
        _sum: { amount: true },
      })
    : { _sum: { amount: 0 } };

  const dbHealthy = true;
  const cronHealthy = staleLevelResets === 0;
  const payoutHealthy = failedPayments === 0;
  const queueHealthy = oldPendingWithdrawals === 0 && oldPendingAdminReviews === 0;

  const alerts: string[] = [];
  if (oldPendingWithdrawals > 0) {
    alerts.push(t("actionAlerts.items.withdrawalsPending", { count: oldPendingWithdrawals }));
  }
  if (oldPendingAdminReviews > 0) {
    alerts.push(t("actionAlerts.items.adminReviewsPending", { count: oldPendingAdminReviews }));
  }
  if (failedPayments > 0) {
    alerts.push(t("actionAlerts.items.failedPayments", { count: failedPayments }));
  }
  if (suspiciousUsers > 0) {
    alerts.push(t("actionAlerts.items.suspiciousUsers", { count: suspiciousUsers }));
  }
  if (staleLevelResets > 0) {
    alerts.push(t("actionAlerts.items.staleResets", { count: staleLevelResets }));
  }

  const chartBuckets = new Map<string, number>();
  const payoutBuckets = new Map<string, number>();
  for (let i = chartMonthCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    chartBuckets.set(key, 0);
    payoutBuckets.set(key, 0);
  }
  for (const item of earningsForChart) {
    const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!chartBuckets.has(key)) continue;
    chartBuckets.set(key, (chartBuckets.get(key) || 0) + item.amount);
  }
  for (const item of payoutsForChart) {
    const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!payoutBuckets.has(key)) continue;
    payoutBuckets.set(key, (payoutBuckets.get(key) || 0) + item.amount);
  }
  const revenueChartData = Array.from(chartBuckets.entries()).map(([key, amount]) => {
    const [year, month] = key.split("-");
    const monthNumber = Number(month);
    return {
      month: `${monthNames[monthNumber - 1]} '${year.slice(2)}`,
      revenue: Number(amount.toFixed(2)),
      payout: Number((payoutBuckets.get(key) || 0).toFixed(2)),
    };
  });

  return (
    <div className="space-y-8">
      <DashboardNavbar />

      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600/80 dark:text-emerald-300/70">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/65 md:text-base">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <KpiCard label={t("kpis.totalUsers")} value={users} />
        <KpiCard label={t("kpis.businesses")} value={businesses} />
        <KpiCard
          label={t("kpis.revenue")}
          value={`INR ${formatMoney(revenue._sum.amount)}`}
          tone="success"
        />
        <KpiCard label={t("kpis.liveCampaigns")} value={liveCampaigns} tone="info" />
        <KpiCard label={t("kpis.managers")} value={managers} />
        <KpiCard
          label={t("kpis.pendingCampaigns")}
          value={pendingCampaigns}
          tone="warning"
        />
        <KpiCard label={t("kpis.pendingWithdrawals")} value={pendingWithdrawals} tone="warning" />
        <KpiCard label={t("kpis.pendingBusinessKyc")} value={pendingBusinessKyc} tone="warning" />
        <KpiCard label={t("kpis.totalSubmissions")} value={totalSubmissions} />
        <KpiCard label={t("kpis.pendingFinalReviews")} value={pendingFinalReviews} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SectionCard elevated className="lg:col-span-2">
            <p className="mb-4 text-sm text-foreground/60">{t("systemHealth.title")}</p>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{t("systemHealth.database")}</span>
                <StatusBadge label={dbHealthy ? t("systemHealth.statuses.healthy") : t("systemHealth.statuses.issue")} tone={dbHealthy ? "success" : "danger"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{t("systemHealth.cron")}</span>
                <StatusBadge label={cronHealthy ? t("systemHealth.statuses.onTime") : t("systemHealth.statuses.delayed")} tone={cronHealthy ? "success" : "warning"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{t("systemHealth.payouts")}</span>
                <StatusBadge label={payoutHealthy ? t("systemHealth.statuses.noFailures") : t("systemHealth.statuses.checkNeeded")} tone={payoutHealthy ? "success" : "warning"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{t("systemHealth.moderationQueue")}</span>
                <StatusBadge label={queueHealthy ? t("systemHealth.statuses.onTrack") : t("systemHealth.statuses.attentionNeeded")} tone={queueHealthy ? "success" : "warning"} />
              </div>
            </div>
        </SectionCard>

        <SectionCard elevated className="lg:col-span-2">
            <p className="mb-4 text-sm text-foreground/60">{t("actionAlerts.title")}</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("actionAlerts.empty")}</p>
            ) : (
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                {alerts.map((alert) => (
                  <li
                    key={alert}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-100"
                  >
                    {alert}
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-foreground/60">{t("trend.eyebrow")}</p>
          <h3 className="text-xl font-semibold text-foreground">{t("trend.title")}</h3>
        </div>
        <RevenueChart data={revenueChartData} />
      </div>
    </div>
  );
}
