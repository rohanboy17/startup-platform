import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { applyFundingFee } from "@/lib/commission";

export async function settleBusinessFunding(params: {
  providerOrderId: string;
  providerPaymentId: string;
  source: "VERIFY_API" | "WEBHOOK";
  expectedUserId?: string;
}) {
  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { providerOrderId: params.providerOrderId },
    select: {
      id: true,
      userId: true,
      amount: true,
      status: true,
      providerPaymentId: true,
    },
  });

  if (!paymentOrder) {
    throw new Error("Payment order not found");
  }

  if (params.expectedUserId && paymentOrder.userId !== params.expectedUserId) {
    throw new Error("Payment order does not belong to this user");
  }

  if (paymentOrder.status === "PAID") {
    return { alreadyProcessed: true };
  }

  const { fee, net, feeRate } = applyFundingFee(paymentOrder.amount);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: paymentOrder.userId },
      data: {
        balance: {
          increment: net,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: paymentOrder.userId,
        amount: net,
        type: "CREDIT",
        note:
          fee > 0
            ? `Business wallet top-up after ${(feeRate * 100).toFixed(0)}% fee (Razorpay ${params.source})`
            : `Business wallet top-up credited (Razorpay ${params.source})`,
      },
    });

    if (fee > 0) {
      await tx.platformEarning.create({
        data: {
          amount: fee,
          source: `Business deposit fee (${(feeRate * 100).toFixed(0)}%)`,
        },
      });

      await tx.platformTreasury.upsert({
        where: { id: "main" },
        update: {
          balance: { increment: fee },
        },
        create: {
          id: "main",
          balance: fee,
        },
      });
    }

    await tx.businessWallet.upsert({
      where: { businessId: paymentOrder.userId },
      update: {
        balance: { increment: net },
        totalFunded: { increment: net },
      },
      create: {
        businessId: paymentOrder.userId,
        balance: net,
        totalFunded: net,
      },
    });

    await tx.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: "PAID",
        providerPaymentId: params.providerPaymentId,
        paidAt: new Date(),
      },
    });
  });

  await writeAuditLog({
    actorRole: "SYSTEM",
    targetUserId: paymentOrder.userId,
    action: "BUSINESS_FUNDING_SETTLED",
    details: `providerOrderId=${params.providerOrderId}, source=${params.source}, gross=${paymentOrder.amount}, fee=${fee}, net=${net}`,
  });

  return { alreadyProcessed: false };
}
