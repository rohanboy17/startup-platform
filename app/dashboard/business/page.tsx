import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function BusinessDashboard() {
  const session = await auth();
  const business = await prisma.user.findUnique({
    where: { id: session!.user.id },
  });

  const campaigns = await prisma.task.count({
    where: { businessId: session!.user.id },
  });

  const activeCampaigns = await prisma.task.count({
    where: {
      businessId: session!.user.id,
      status: "ACTIVE",
    },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Business Overview</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Wallet Balance</p>
            <h2 className="mt-2 text-3xl font-bold text-green-400">
              ₹ {business?.balance || 0}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Total Campaigns</p>
            <h2 className="mt-2 text-3xl font-bold">{campaigns}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Active Campaigns</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-400">
              {activeCampaigns}
            </h2>
          </CardContent>
        </Card>
      </div>

      <div>
        <Link
          href="/dashboard/business/funding"
          className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Add Wallet Funds
        </Link>
      </div>
    </div>
  );
}
