import type { Prisma } from "@prisma/client";

export function getJobBudgetDelta(budgetRequired: number, lockedBudgetAmount: number) {
  const safeBudgetRequired = Number.isFinite(budgetRequired) ? Math.max(0, budgetRequired) : 0;
  const safeLockedBudget = Number.isFinite(lockedBudgetAmount) ? Math.max(0, lockedBudgetAmount) : 0;
  const delta = Number((safeBudgetRequired - safeLockedBudget).toFixed(2));
  return Math.abs(delta) < 0.01 ? 0 : delta;
}

export async function applyJobBudgetDelta(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    jobTitle: string;
    budgetDelta: number;
  }
) {
  if (params.budgetDelta === 0) {
    return;
  }

  if (params.budgetDelta > 0) {
    await tx.businessWallet.update({
      where: { businessId: params.businessId },
      data: {
        balance: { decrement: params.budgetDelta },
        totalSpent: { increment: params.budgetDelta },
      },
    });

    await tx.user.update({
      where: { id: params.businessId },
      data: {
        balance: { decrement: params.budgetDelta },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: params.businessId,
        type: "DEBIT",
        amount: params.budgetDelta,
        note: `Job budget reserved: ${params.jobTitle}`,
      },
    });

    return;
  }

  const releasedAmount = Math.abs(params.budgetDelta);

  await tx.businessWallet.update({
    where: { businessId: params.businessId },
    data: {
      balance: { increment: releasedAmount },
      totalSpent: { decrement: releasedAmount },
    },
  });

  await tx.user.update({
    where: { id: params.businessId },
    data: {
      balance: { increment: releasedAmount },
    },
  });

  await tx.walletTransaction.create({
    data: {
      userId: params.businessId,
      type: "CREDIT",
      amount: releasedAmount,
      note: `Job budget released: ${params.jobTitle}`,
    },
  });
}
