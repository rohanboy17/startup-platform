import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import PlatformPayoutRequest from "@/components/platform-payout-request";
import PlatformPayoutActions from "@/components/platform-payout-actions";
import AdminWalletAdjustmentReviewActions from "@/components/admin-wallet-adjustment-review-actions";
import { reconcileTreasuryBalance } from "@/lib/treasury";
import { formatMoney } from "@/lib/format-money";

export default async function AdminRevenuePage() {
  const payoutDailyLimit = Number(process.env.PAYOUT_DAILY_LIMIT ?? 200000);
  const payoutPerRequestLimit = Number(process.env.PAYOUT_MAX_REQUEST ?? 50000);
  const delegates = prisma as unknown as {
    platformTreasury?: {
      upsert: (args: {
        where: { id: string };
        update: object;
        create: { id: string; balance: number };
      }) => Promise<{ balance: number }>;
    };
    platformPayout?: {
      findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<
        Array<{
          id: string;
          amount: number;
          note: string | null;
          status: string;
          createdAt: Date;
          processedAt: Date | null;
        }>
      >;
    };
    platformEarning?: {
      aggregate: (args: { _sum: { amount: true } }) => Promise<{ _sum: { amount: number | null } }>;
    };
    walletAdjustmentRequest?: {
      findMany: (args: {
        where: { status: "PENDING" };
        include: {
          targetUser: { select: { name: true; email: true } };
          requestedByUser: { select: { name: true; email: true } };
        };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          amount: number;
          type: "CREDIT" | "DEBIT";
          reason: string;
          createdAt: Date;
          targetUser: { name: string | null; email: string };
          requestedByUser: { name: string | null; email: string };
        }>
      >;
    };
  };

  const [treasury, platformRevenue, payouts, pendingAdjustments] = await Promise.all([
    delegates.platformTreasury
      ? delegates.platformTreasury.upsert({
          where: { id: "main" },
          update: {},
          create: { id: "main", balance: 0 },
        })
      : Promise.resolve({ balance: 0 }),
    delegates.platformEarning
      ? delegates.platformEarning.aggregate({
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    delegates.platformPayout
      ? delegates.platformPayout.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    delegates.walletAdjustmentRequest
      ? delegates.walletAdjustmentRequest.findMany({
          where: { status: "PENDING" },
          include: {
            targetUser: { select: { name: true, email: true } },
            requestedByUser: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);
  const reconciledBalance =
    delegates.platformTreasury && delegates.platformPayout && delegates.platformEarning
      ? await reconcileTreasuryBalance()
      : treasury.balance;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayPayouts = payouts.filter((p) => p.createdAt >= todayStart);
  const todayRequestedAmount = todayPayouts
    .filter((p) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Platform Revenue</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-sm text-white/60">Total Commission Earned</p>
            <p className="mt-1 text-2xl font-semibold">
              INR {formatMoney(platformRevenue._sum.amount)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-sm text-white/60">Treasury Available (Reconciled)</p>
            <p className="mt-1 text-2xl font-semibold">INR {formatMoney(reconciledBalance)}</p>
            <p className="mt-2 text-xs text-white/50">
              Payout limits: per request INR {formatMoney(payoutPerRequestLimit)} | daily INR{" "}
              {formatMoney(payoutDailyLimit)}
            </p>
            <p className="text-xs text-white/50">
              Today requested: INR {formatMoney(todayRequestedAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {!delegates.platformTreasury || !delegates.platformPayout ? (
        <Card className="rounded-2xl border-amber-300/20 bg-amber-500/10">
          <CardContent className="p-6 text-sm text-amber-200">
            Revenue payout system is unavailable in current runtime. Restart the dev server.
          </CardContent>
        </Card>
      ) : (
        <PlatformPayoutRequest />
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Wallet Adjustment Approvals (Immutable)</h3>
        {pendingAdjustments.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No pending wallet adjustment requests.
            </CardContent>
          </Card>
        ) : (
          pendingAdjustments.map((item) => (
            <Card key={item.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">
                    {item.type} INR {formatMoney(item.amount)}
                  </p>
                  <p className="text-sm text-white/70">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-sm text-white/70">
                  Target: {item.targetUser.name || "Unnamed"} ({item.targetUser.email})
                </p>
                <p className="text-sm text-white/70">
                  Requested by: {item.requestedByUser.name || "Unnamed"} ({item.requestedByUser.email})
                </p>
                <p className="text-sm text-white/70">Reason: {item.reason}</p>
                <AdminWalletAdjustmentReviewActions requestId={item.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold">Payout Requests</h3>
          <Link
            href="/api/admin/revenue/payouts/export?status=ALL"
            className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-center text-sm text-white hover:bg-white/10"
          >
            Export Payout CSV
          </Link>
        </div>
        {payouts.length === 0 ? (
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardContent className="p-6 text-sm text-white/60">
              No payout requests yet.
            </CardContent>
          </Card>
        ) : (
          payouts.map((payout) => (
            <Card key={payout.id} className="rounded-2xl border-white/10 bg-white/5">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">INR {formatMoney(payout.amount)}</p>
                  <p className="text-sm text-white/70">{payout.status}</p>
                </div>
                {payout.note ? <p className="text-sm text-white/70">{payout.note}</p> : null}
                <p className="text-xs text-white/50">
                  Requested: {new Date(payout.createdAt).toLocaleString()}
                </p>
                {payout.processedAt ? (
                  <p className="text-xs text-white/50">
                    Processed: {new Date(payout.processedAt).toLocaleString()}
                  </p>
                ) : null}
                {payout.status !== "APPROVED" ? (
                  <PlatformPayoutActions payoutId={payout.id} status={payout.status as "PENDING" | "APPROVED" | "REJECTED"} />
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
