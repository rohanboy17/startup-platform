import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import WithdrawRequestCard from "@/components/withdraw-request-card";
import { formatMoney } from "@/lib/format-money";

export default async function WithdrawalsPage() {
  const session = await auth();

  const [user, withdrawals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { balance: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const minWithdrawal = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 200);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Withdrawals</h2>
      <p className="text-sm text-white/60">
        Current wallet balance: INR {formatMoney(user?.balance)}
      </p>

      <WithdrawRequestCard minAmount={minWithdrawal} />

      <div className="divide-y divide-white/10 rounded-2xl bg-white/5">
        {withdrawals.length === 0 ? (
          <div className="p-6 text-sm text-white/60">No withdrawal history yet.</div>
        ) : (
          withdrawals.map((w) => (
            <div key={w.id} className="flex justify-between p-6">
              <div>
                <p className="font-medium">Withdrawal Request</p>
                <p className="text-sm text-white/50">
                  {new Date(w.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p>INR {formatMoney(w.amount)}</p>
                <p className="text-sm text-white/60">{w.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
