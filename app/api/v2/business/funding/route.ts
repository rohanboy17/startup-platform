import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { getAppSettings } from "@/lib/system-settings";
import { getMinFundingThreshold } from "@/lib/notifications";
import { getBusinessContext } from "@/lib/business-context";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const [wallet, appSettings, paymentOrders, transactions, campaignBudget] = await Promise.all([
    ensureBusinessWalletSynced(context.businessUserId),
    getAppSettings(),
    prisma.paymentOrder.findMany({
      where: { userId: context.businessUserId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        receipt: true,
        providerOrderId: true,
        providerPaymentId: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.walletTransaction.findMany({
      where: { userId: context.businessUserId },
      select: {
        id: true,
        amount: true,
        type: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.campaign.aggregate({
      where: {
        businessId: context.businessUserId,
        status: { in: ["PENDING", "APPROVED", "LIVE"] },
      },
      _sum: {
        remainingBudget: true,
      },
    }),
  ]);

  const recentDeposits = transactions.filter((item) => item.type === "CREDIT");
  const recentRefunds = transactions.filter(
    (item) => item.type === "DEBIT" && item.note?.toLowerCase().includes("refund")
  );

  return NextResponse.json({
    wallet: {
      balance: wallet.balance,
      totalFunded: wallet.totalFunded,
      totalSpent: wallet.totalSpent,
      totalRefund: wallet.totalRefund,
      lockedBudget: campaignBudget._sum.remainingBudget || 0,
    },
    config: {
      fundingFeeRate: appSettings.fundingFeeRate,
      minFundingThreshold: getMinFundingThreshold(),
    },
    paymentOrders,
    transactions,
    stats: {
      depositsCount: recentDeposits.length,
      refundCount: recentRefunds.length,
      lastPaidAt: paymentOrders.find((item) => item.status === "PAID")?.paidAt || null,
    },
  });
}
