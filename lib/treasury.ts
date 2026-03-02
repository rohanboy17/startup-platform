import { prisma } from "@/lib/prisma";

export async function reconcileTreasuryBalance() {
  const [revenueAgg, payoutAgg, treasury] = await Promise.all([
    prisma.platformEarning.aggregate({
      _sum: { amount: true },
    }),
    prisma.platformPayout.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.platformTreasury.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main", balance: 0 },
    }),
  ]);

  const earned = revenueAgg._sum.amount || 0;
  const paidOut = payoutAgg._sum.amount || 0;
  const reconciled = Number(Math.max(0, earned - paidOut).toFixed(2));

  if (Math.abs(treasury.balance - reconciled) > 0.001) {
    await prisma.platformTreasury.update({
      where: { id: "main" },
      data: { balance: reconciled },
    });
  }

  return reconciled;
}
