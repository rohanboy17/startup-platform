import { prisma } from "@/lib/prisma";
import DashboardNavbar from "@/components/dashboard-navbar";
import RevenueChart from "@/components/revenue-chart";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminDashboard() {
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
    prisma.user.count({ where: { lastLevelResetAt: { lt: staleResetCutoff } } }),
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
    alerts.push(`${oldPendingWithdrawals} withdrawal request(s) pending for more than 24 hours.`);
  }
  if (oldPendingAdminReviews > 0) {
    alerts.push(`${oldPendingAdminReviews} manager-approved submission(s) waiting admin review for over 24 hours.`);
  }
  if (failedPayments > 0) {
    alerts.push(`${failedPayments} failed payment order(s) need reconciliation.`);
  }
  if (suspiciousUsers > 0) {
    alerts.push(`${suspiciousUsers} suspicious user account(s) flagged.`);
  }
  if (staleLevelResets > 0) {
    alerts.push(`Cron reset lag detected for ${staleLevelResets} user(s).`);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <KpiCard label="Total Users" value={users} />
        <KpiCard label="Businesses" value={businesses} />
        <KpiCard
          label="Revenue"
          value={`INR ${formatMoney(revenue._sum.amount)}`}
          tone="success"
        />
        <KpiCard label="Live Campaigns" value={liveCampaigns} tone="info" />
        <KpiCard label="Managers" value={managers} />
        <KpiCard
          label="Pending Campaigns"
          value={pendingCampaigns}
          tone="warning"
        />
        <KpiCard label="Pending Withdrawals" value={pendingWithdrawals} tone="warning" />
        <KpiCard label="Pending Business KYC" value={pendingBusinessKyc} tone="warning" />
        <KpiCard label="Total Submissions" value={totalSubmissions} />
        <KpiCard label="Pending Final Reviews" value={pendingFinalReviews} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SectionCard elevated className="lg:col-span-2">
            <p className="mb-4 text-sm text-foreground/60">System Health</p>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>Database</span>
                <StatusBadge label={dbHealthy ? "HEALTHY" : "ISSUE"} tone={dbHealthy ? "success" : "danger"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>Cron (Daily Reset)</span>
                <StatusBadge label={cronHealthy ? "ON TIME" : "DELAYED"} tone={cronHealthy ? "success" : "warning"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>Payouts</span>
                <StatusBadge label={payoutHealthy ? "NO FAILURES" : "CHECK NEEDED"} tone={payoutHealthy ? "success" : "warning"} />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>Moderation Queue</span>
                <StatusBadge label={queueHealthy ? "HEALTHY" : "STALE ITEMS"} tone={queueHealthy ? "success" : "warning"} />
              </div>
            </div>
        </SectionCard>

        <SectionCard elevated className="lg:col-span-2">
            <p className="mb-4 text-sm text-foreground/60">Action Alerts</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">No critical alert right now.</p>
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
          <p className="text-sm text-foreground/60">Platform trend</p>
          <h3 className="text-xl font-semibold text-foreground">Revenue vs payout</h3>
        </div>
        <RevenueChart data={revenueChartData} />
      </div>
    </div>
  );
}
