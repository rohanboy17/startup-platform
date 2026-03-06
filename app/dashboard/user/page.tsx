import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";

export default async function UserDashboard() {
  const session = await auth();
  const [user, submissions, pendingWithdrawalAmount, totalWithdrawn] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
    }),
    prisma.submission.count({
      where: { userId: session!.user.id },
    }),
    prisma.withdrawal.aggregate({
      where: {
        userId: session!.user.id,
        status: "PENDING",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.withdrawal.aggregate({
      where: {
        userId: session!.user.id,
        status: "APPROVED",
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold md:text-3xl">Welcome back</h2>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5 sm:p-6">
            <p className="text-white/60">Wallet Balance</p>
            <h2 className="mt-2 text-2xl font-bold text-green-400 sm:text-3xl">
              INR {formatMoney(user?.balance)}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5 sm:p-6">
            <p className="text-white/60">Total Submissions</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{submissions}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5 sm:p-6">
            <p className="text-white/60">Account Status</p>
            <h2 className="mt-2 text-2xl font-bold text-blue-400 sm:text-3xl">Active</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5 sm:p-6">
            <p className="text-white/60">Pending Withdrawal Amount</p>
            <h2 className="mt-2 text-2xl font-bold text-amber-300 sm:text-3xl">
              INR {formatMoney(pendingWithdrawalAmount._sum.amount)}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-5 sm:p-6">
            <p className="text-white/60">Total Withdrawn</p>
            <h2 className="mt-2 text-2xl font-bold text-cyan-300 sm:text-3xl">
              INR {formatMoney(totalWithdrawn._sum.amount)}
            </h2>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
