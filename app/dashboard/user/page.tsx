import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format-money";

export default async function UserDashboard() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  });
  const submissions = await prisma.submission.count({
    where: { userId: session!.user.id },
  });

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Welcome back</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Wallet Balance</p>
            <h2 className="mt-2 text-3xl font-bold text-green-400">
              INR {formatMoney(user?.balance)}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Total Submissions</p>
            <h2 className="mt-2 text-3xl font-bold">{submissions}</h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/5">
          <CardContent className="p-6">
            <p className="text-white/60">Account Status</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-400">Active</h2>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
