import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { getAppSettings } from "@/lib/system-settings";
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [wallet, appSettings, campaigns, approvedSubmissions, pendingReviews, todayApprovals, recentTransactions, user] =
    await Promise.all([
    ensureBusinessWalletSynced(context.businessUserId),
    getAppSettings(),
    prisma.campaign.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        status: true,
        totalBudget: true,
        remainingBudget: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.findMany({
      where: {
        campaign: { businessId: context.businessUserId },
        adminStatus: "ADMIN_APPROVED",
      },
      select: {
        createdAt: true,
        campaign: {
          select: {
            title: true,
            rewardPerTask: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count({
      where: {
        campaign: { businessId: context.businessUserId },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
      },
    }),
    prisma.submission.findMany({
      where: {
        campaign: { businessId: context.businessUserId },
        adminStatus: "ADMIN_APPROVED",
        createdAt: { gte: todayStart },
      },
      select: {
        campaign: {
          select: {
            rewardPerTask: true,
          },
        },
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
      take: 4,
    }),
    prisma.user.findUnique({
      where: { id: context.businessUserId },
      select: { kycStatus: true, kycVerifiedAt: true },
    }),
  ]);

  const totalCampaigns = campaigns.length;
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === "LIVE").length;
  const pendingCampaigns = campaigns.filter((campaign) => campaign.status === "PENDING").length;
  const completedCampaigns = campaigns.filter((campaign) => campaign.status === "COMPLETED").length;
  const lockedBudget = campaigns
    .filter((campaign) => ["PENDING", "APPROVED", "LIVE"].includes(campaign.status))
    .reduce((sum, campaign) => sum + campaign.remainingBudget, 0);
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.totalBudget, 0);
  const remainingBudget = campaigns.reduce((sum, campaign) => sum + campaign.remainingBudget, 0);
  const spentBudget = totalBudget - remainingBudget;
  const approvedCount = approvedSubmissions.length;
  const todaySpend = todayApprovals.reduce(
    (sum, submission) => sum + (submission.campaign?.rewardPerTask || 0),
    0
  );
  const averageCostPerApproval = approvedCount > 0 ? spentBudget / approvedCount : 0;
  const lowBalanceThreshold = Number(process.env.NEXT_PUBLIC_MIN_FUNDING_THRESHOLD ?? 500);

  const activityFeed = [
    ...campaigns.slice(0, 3).map((campaign) => ({
      id: `campaign-${campaign.id}`,
      kind: "CAMPAIGN",
      message: `Campaign "${campaign.title}" is ${campaign.status.toLowerCase()}.`,
      createdAt: campaign.createdAt,
    })),
    ...approvedSubmissions.slice(0, 3).map((submission, index) => ({
      id: `approval-${index}-${submission.createdAt.toISOString()}`,
      kind: "APPROVAL",
      message: `Submission approved for "${submission.campaign?.title || "Campaign"}".`,
      createdAt: submission.createdAt,
    })),
    ...recentTransactions.map((transaction) => ({
      id: `wallet-${transaction.id}`,
      kind: "WALLET",
      message: transaction.note || `${transaction.type.toLowerCase()} transaction recorded.`,
      createdAt: transaction.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  return NextResponse.json({
    accessRole: context.accessRole,
    kycStatus: user?.kycStatus || "PENDING",
    kycVerifiedAt: user?.kycVerifiedAt || null,
    wallet: {
      balance: wallet.balance,
      totalFunded: wallet.totalFunded,
      totalSpent: wallet.totalSpent,
      totalRefund: wallet.totalRefund,
    },
    lowBalanceThreshold,
    lowBalance: wallet.balance < lowBalanceThreshold,
    totalCampaigns,
    liveCampaigns,
    pendingCampaigns,
    completedCampaigns,
    lockedBudget,
    totalBudget,
    remainingBudget,
    spentBudget,
    approvedSubmissions: approvedCount,
    pendingReviews,
    todaySpend,
    averageCostPerApproval,
    fundingFeeRate: appSettings.fundingFeeRate,
    businessRefundFeeRate: appSettings.businessRefundFeeRate,
    activityFeed,
  });
}
