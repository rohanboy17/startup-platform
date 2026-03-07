import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function ManagerDashboardPage() {
  await auth();

  const [pendingForManager, managerApprovedPendingAdmin, managerRejected] = await Promise.all([
    prisma.submission.count({
      where: { campaignId: { not: null }, managerStatus: "PENDING" },
    }),
    prisma.submission.count({
      where: { campaignId: { not: null }, managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
    }),
    prisma.submission.count({
      where: { campaignId: { not: null }, managerStatus: "MANAGER_REJECTED" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Manager Overview</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Pending Manager Review</p>
            <h3 className="mt-2 text-3xl font-bold">{pendingForManager}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Approved by Manager</p>
            <h3 className="mt-2 text-3xl font-bold text-blue-400">{managerApprovedPendingAdmin}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Rejected by Manager</p>
            <h3 className="mt-2 text-3xl font-bold text-rose-400">{managerRejected}</h3>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
