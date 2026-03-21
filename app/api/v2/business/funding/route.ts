import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { getMinFundingThreshold } from "@/lib/notifications";
import { canManageBusinessBilling, getBusinessContext } from "@/lib/business-context";
import { getManualBusinessFundingConfig } from "@/lib/manual-business-funding";
import { getAppSettings } from "@/lib/system-settings";
import { getBusinessSettings } from "@/lib/business-settings";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const [wallet, campaignBudget, recentRequests, transactions, appSettings, businessUser] = await Promise.all([
    ensureBusinessWalletSynced(context.businessUserId),
    prisma.campaign.aggregate({
      where: {
        businessId: context.businessUserId,
        status: { in: ["PENDING", "APPROVED", "LIVE"] },
      },
      _sum: {
        remainingBudget: true,
      },
    }),
    prisma.businessFunding.findMany({
      where: { businessId: context.businessUserId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        referenceId: true,
        utr: true,
        payoutUpiId: true,
        payoutUpiName: true,
        proofImage: true,
        status: true,
        flaggedReason: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
      },
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
    getAppSettings(),
    prisma.user.findUnique({
      where: { id: context.businessUserId },
      select: {
        name: true,
        email: true,
      },
    }),
  ]);
  const [refundRequests, pendingRefundAgg] = await Promise.all([
    prisma.businessRefundRequest.findMany({
      where: { businessId: context.businessUserId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        requestNote: true,
        status: true,
        flaggedReason: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
    prisma.businessRefundRequest.aggregate({
      where: {
        businessId: context.businessUserId,
        status: "PENDING",
      },
      _sum: { amount: true },
    }),
  ]);

  const config = getManualBusinessFundingConfig();
  const pendingCount = recentRequests.filter((item) => item.status === "PENDING").length;
  const businessSettings = await getBusinessSettings(context.businessUserId, {
    name: businessUser?.name,
    email: businessUser?.email,
  });

  return NextResponse.json({
    wallet: {
      balance: wallet.balance,
      totalFunded: wallet.totalFunded,
      totalSpent: wallet.totalSpent,
      totalRefund: wallet.totalRefund,
      lockedBudget: campaignBudget._sum.remainingBudget || 0,
    },
    config: {
      minFundingThreshold: getMinFundingThreshold(),
      upiId: config.upiId,
      upiName: config.upiName,
      phoneNumber: config.phoneNumber,
      whatsappNumber: config.whatsappNumber,
      manualFundingEnabled: Boolean(config.upiId || config.phoneNumber),
      canManageBilling: canManageBusinessBilling(context.accessRole),
      fundingFeeRate: appSettings.fundingFeeRate,
      businessRefundFeeRate: appSettings.businessRefundFeeRate,
    },
    defaults: {
      payoutUpiId: businessSettings.defaultPayoutUpiId,
      payoutUpiName: businessSettings.defaultPayoutUpiName,
    },
    requests: recentRequests,
    transactions,
    refundRequests,
    refundableBalance: Math.max(0, wallet.balance - (pendingRefundAgg._sum.amount || 0)),
    stats: {
      pendingCount,
      approvedCount: recentRequests.filter((item) => item.status === "APPROVED").length,
      rejectedCount: recentRequests.filter((item) => item.status === "REJECTED").length,
      pendingRefundCount: refundRequests.filter((item) => item.status === "PENDING").length,
    },
  });
}
