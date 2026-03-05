import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import DashboardNavbar from "@/components/dashboard-navbar";
import RevenueChart from "@/components/revenue-chart";
import { formatMoney } from "@/lib/format-money";

export default async function AdminDashboard() {
  const [users, businesses, managers, pendingCampaigns, pendingFinalReviews, liveCampaigns] =
    await Promise.all([
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

  return (
    <div>
      <DashboardNavbar />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Total Users</p>
            <h2 className="mt-2 text-3xl font-bold">{users}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Businesses</p>
            <h2 className="mt-2 text-3xl font-bold">{businesses}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Revenue</p>
            <h2 className="mt-2 text-3xl font-bold text-green-500">
              INR {formatMoney(revenue._sum.amount)}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Live Campaigns</p>
            <h2 className="mt-2 text-3xl font-bold">{liveCampaigns}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Managers</p>
            <h2 className="mt-2 text-3xl font-bold">{managers}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Pending Campaigns</p>
            <h2 className="mt-2 text-3xl font-bold">{pendingCampaigns}</h2>
            <p className="mt-2 text-xs text-white/60">Final Reviews: {pendingFinalReviews}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <RevenueChart />
      </div>
    </div>
  );
}
