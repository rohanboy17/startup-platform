import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: paymentOrder.userId },
      data: {
        balance: {
          increment: paymentOrder.amount,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: paymentOrder.userId,
        amount: paymentOrder.amount,
        type: "CREDIT",
        note: `Business wallet top-up (Razorpay ${params.source})`,
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
    details: `providerOrderId=${params.providerOrderId}, source=${params.source}, amount=${paymentOrder.amount}`,
  });

  return { alreadyProcessed: false };
}
