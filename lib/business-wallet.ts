import { prisma } from "@/lib/prisma";

export async function ensureBusinessWalletSynced(userId: string) {
  const [user, wallet] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    }),
    prisma.businessWallet.findUnique({
      where: { businessId: userId },
    }),
  ]);

  if (!user) {
    throw new Error("Business user not found");
  }

  if (!wallet) {
    return prisma.businessWallet.create({
      data: {
        businessId: userId,
        balance: user.balance,
        totalFunded: user.balance > 0 ? user.balance : 0,
        totalSpent: 0,
        totalRefund: 0,
      },
    });
  }

  if (Math.abs(wallet.balance - user.balance) > 0.001) {
    return prisma.businessWallet.update({
      where: { businessId: userId },
      data: { balance: user.balance },
    });
  }

  return wallet;
}
