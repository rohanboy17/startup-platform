import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import DashboardNavbar from "@/components/dashboard-navbar";
import RevenueChart from "@/components/revenue-chart";
import { formatMoney } from "@/lib/format-money";

export default async function AdminDashboard() {
  const now = new Date();
  const staleResetCutoff = new Date(now.getTime() - 26 * 60 * 60 * 1000);
  const staleQueueCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "BUSINESS" } }),
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
    prisma.user.count({ where: { role: "BUSINESS", kycStatus: "PENDING" } }),
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

  return (
    <div className="space-y-8">
      <DashboardNavbar />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 xl:grid-cols-8">
        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Total Users</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{users}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Businesses</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{businesses}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Revenue</p>
            <h2 className="mt-2 text-2xl font-bold text-green-500 sm:text-3xl">
              INR {formatMoney(revenue._sum.amount)}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Live Campaigns</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{liveCampaigns}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Managers</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{managers}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Pending Campaigns</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{pendingCampaigns}</h2>
            <p className="mt-2 text-xs text-white/60">Final Reviews: {pendingFinalReviews}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Pending Withdrawals</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{pendingWithdrawals}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Pending Business KYC</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{pendingBusinessKyc}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <p className="text-muted-foreground">Total Submissions</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{totalSubmissions}</h2>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="rounded-2xl border-white/10 bg-white/5 lg:col-span-2">
          <CardContent className="p-6">
            <p className="mb-4 text-sm text-white/60">System Health</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Database</span>
                <span className={dbHealthy ? "text-emerald-300" : "text-rose-300"}>
                  {dbHealthy ? "HEALTHY" : "ISSUE"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Cron (Daily Reset)</span>
                <span className={cronHealthy ? "text-emerald-300" : "text-amber-300"}>
                  {cronHealthy ? "ON TIME" : "DELAYED"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Payouts</span>
                <span className={payoutHealthy ? "text-emerald-300" : "text-amber-300"}>
                  {payoutHealthy ? "NO FAILURES" : "CHECK NEEDED"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Moderation Queue</span>
                <span className={queueHealthy ? "text-emerald-300" : "text-amber-300"}>
                  {queueHealthy ? "HEALTHY" : "STALE ITEMS"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5 lg:col-span-2">
          <CardContent className="p-6">
            <p className="mb-4 text-sm text-white/60">Action Alerts</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-emerald-300">No critical alert right now.</p>
            ) : (
              <ul className="space-y-2 text-sm text-amber-200">
                {alerts.map((alert) => (
                  <li key={alert} className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2">
                    {alert}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <RevenueChart />
      </div>
    </div>
  );
}
