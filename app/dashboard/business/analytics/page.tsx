import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function BusinessAnalyticsPage() {
  const session = await auth();

  const [totalCampaigns, activeCampaigns, totalBudgetLeft] = await Promise.all([
    prisma.task.count({
      where: { businessId: session!.user.id },
    }),
    prisma.task.count({
      where: { businessId: session!.user.id, status: "ACTIVE" },
    }),
    prisma.task.aggregate({
      where: { businessId: session!.user.id },
      _sum: { remainingBudget: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Campaign Analytics</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Total Campaigns</p>
            <h3 className="mt-2 text-3xl font-bold">{totalCampaigns}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Active Campaigns</p>
            <h3 className="mt-2 text-3xl font-bold text-blue-400">{activeCampaigns}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Remaining Budget</p>
            <h3 className="mt-2 text-3xl font-bold text-green-400">
              ₹ {totalBudgetLeft._sum.remainingBudget || 0}
            </h3>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
