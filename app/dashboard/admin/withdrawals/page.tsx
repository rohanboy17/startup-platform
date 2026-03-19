import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import AdminWithdrawalActions from "@/components/admin-withdrawal-actions";
import { formatMoney } from "@/lib/format-money";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const pendingItems = withdrawals.filter((w) => w.status === "PENDING");
  const pendingGross = pendingItems.reduce((sum, w) => sum + w.amount, 0);
  const pendingFee = pendingItems.reduce(
    (sum, w) => sum + Number((w.amount * commissionRate).toFixed(2)),
    0
  );
  const pendingPayout = Number((pendingGross - pendingFee).toFixed(2));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">Payout Requests</h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          Review withdrawal requests, check the net payout amount, and leave clear notes before releasing funds.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Waiting review" value={pendingCount} tone="warning" />
        <KpiCard label="Approved" value={approvedCount} tone="success" />
        <KpiCard label="Rejected" value={rejectedCount} tone="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Gross requested" value={`INR ${formatMoney(pendingGross)}`} />
        <KpiCard label="Platform fee held" value={`INR ${formatMoney(pendingFee)}`} tone="warning" />
        <KpiCard label="Net payout due" value={`INR ${formatMoney(pendingPayout)}`} tone="info" />
      </div>

      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <Card className="rounded-2xl border-foreground/10 bg-background/60">
            <CardContent className="p-6 text-sm text-foreground/70">
              No payout requests yet.
            </CardContent>
          </Card>
        ) : (
          withdrawals.map((w) => {
            const fee = Number((w.amount * commissionRate).toFixed(2));
            const payout = Number((w.amount - fee).toFixed(2));

            return (
              <Card key={w.id} className="rounded-2xl border-foreground/10 bg-background/60">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <p className="font-medium">{w.user.name || w.user.email}</p>
                      <p className="text-sm text-foreground/70">{w.user.email}</p>
                      <p className="text-xs text-foreground/55">
                        UPI: {w.upiName || "N/A"} | {w.upiId || "N/A"}
                      </p>
                      <p className="text-xs text-foreground/55">
                        {new Date(w.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-semibold">INR {formatMoney(w.amount)}</p>
                      <div className="mt-1">
                        <StatusBadge label={w.status} tone={w.status === "APPROVED" ? "success" : w.status === "REJECTED" ? "danger" : "warning"} />
                      </div>
                    </div>
                  </div>

                  <div className="text-sm break-words text-foreground/70">
                    Platform fee ({(commissionRate * 100).toFixed(1)}%): INR {formatMoney(fee)} |
                    Net payout: INR {formatMoney(payout)}
                  </div>
                  {w.adminNote ? <p className="text-xs text-foreground/65">Review note: {w.adminNote}</p> : null}
                  {w.processedAt ? (
                    <p className="text-xs text-foreground/55">
                      Processed: {new Date(w.processedAt).toLocaleString()}
                    </p>
                  ) : null}

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
