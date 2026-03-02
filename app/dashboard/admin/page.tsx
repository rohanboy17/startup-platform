import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import DashboardNavbar from "@/components/dashboard-navbar";
import RevenueChart from "@/components/revenue-chart";

export default async function AdminDashboard() {
  const users = await prisma.user.count({ where: { role: "USER" } });
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

  const activeTasks = await prisma.task.count({ where: { status: "ACTIVE" } });

  return (
    <div>
      <DashboardNavbar />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Total Users</p>
            <h2 className="mt-2 text-3xl font-bold">{users}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Revenue</p>
            <h2 className="mt-2 text-3xl font-bold text-green-500">
              ₹ {revenue._sum.amount || 0}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl transition-all hover:shadow-2xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Active Tasks</p>
            <h2 className="mt-2 text-3xl font-bold">{activeTasks}</h2>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <RevenueChart />
      </div>
    </div>
  );
}
