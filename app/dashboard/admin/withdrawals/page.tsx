import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminWithdrawalActions from "@/components/admin-withdrawal-actions";

export default async function AdminWithdrawalsPage() {
  const commissionRate = Number(process.env.WITHDRAWAL_COMMISSION_RATE ?? 0.02);

  const [withdrawals, totals] = await Promise.all([
    prisma.withdrawal.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawal.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const pendingCount = totals.find((t) => t.status === "PENDING")?._count._all || 0;
  const approvedCount = totals.find((t) => t.status === "APPROVED")?._count._all || 0;
  const rejectedCount = totals.find((t) => t.status === "REJECTED")?._count._all || 0;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Withdrawals</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Pending</p>
            <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Approved</p>
            <p className="mt-1 text-2xl font-semibold">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5">
            <p className="text-sm text-white/60">Rejected</p>
            <p className="mt-1 text-2xl font-semibold">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No withdrawals available.
            </CardContent>
          </Card>
        ) : (
          withdrawals.map((w) => {
            const fee = Number((w.amount * commissionRate).toFixed(2));
            const payout = Number((w.amount - fee).toFixed(2));

            return (
              <Card key={w.id} className="rounded-2xl border-white/10 bg-white/5">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{w.user.name || w.user.email}</p>
                      <p className="text-sm text-white/60">{w.user.email}</p>
                      <p className="text-xs text-white/50">
                        {new Date(w.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">INR {w.amount}</p>
                      <p className="text-sm text-white/70">{w.status}</p>
                    </div>
                  </div>

                  <div className="text-sm text-white/70">
                    Estimated fee ({(commissionRate * 100).toFixed(1)}%): INR {fee} | User payout: INR{" "}
                    {payout}
                  </div>

                  {w.status === "PENDING" ? (
                    <AdminWithdrawalActions withdrawalId={w.id} />
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
