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

  const [
    wallet,
    appSettings,
    totalCampaigns,
    liveCampaigns,
    pendingCampaigns,
    completedCampaigns,
    campaignBudgetTotals,
    campaignLockedBudget,
    recentCampaigns,
    totalJobs,
    openJobs,
    pendingJobs,
    filledJobs,
    jobLockedBudget,
    recentJobs,
    approvedCount,
    recentApprovedSubmissions,
    pendingReviews,
    readyApplicants,
    activeApplicants,
    scheduledInterviews,
    joinedWorkers,
    recentJobApplications,
    todayApprovals,
    recentTransactions,
    user,
  ] = await Promise.all([
    ensureBusinessWalletSynced(context.businessUserId),
    getAppSettings(),
    prisma.campaign.count({ where: { businessId: context.businessUserId } }),
    prisma.campaign.count({
      where: { businessId: context.businessUserId, status: "LIVE" },
    }),
    prisma.campaign.count({
      where: { businessId: context.businessUserId, status: "PENDING" },
    }),
    prisma.campaign.count({
      where: { businessId: context.businessUserId, status: "COMPLETED" },
    }),
    prisma.campaign.aggregate({
      where: { businessId: context.businessUserId },
      _sum: {
        totalBudget: true,
        remainingBudget: true,
      },
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
    prisma.campaign.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.jobPosting.count({ where: { businessId: context.businessUserId } }),
    prisma.jobPosting.count({
      where: { businessId: context.businessUserId, status: "OPEN" },
    }),
    prisma.jobPosting.count({
      where: { businessId: context.businessUserId, status: "PENDING_REVIEW" },
    }),
    prisma.jobPosting.count({
      where: { businessId: context.businessUserId, status: "FILLED" },
    }),
    prisma.jobPosting.aggregate({
      where: { businessId: context.businessUserId },
      _sum: {
        lockedBudgetAmount: true,
      },
    }),
    prisma.jobPosting.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.submission.count({
      where: {
        campaign: { businessId: context.businessUserId },
        adminStatus: "ADMIN_APPROVED",
      },
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.submission.count({
      where: {
        campaign: { businessId: context.businessUserId },
        managerStatus: "MANAGER_APPROVED",
        adminStatus: "PENDING",
      },
    }),
    prisma.jobApplication.count({
      where: {
        job: { businessId: context.businessUserId },
        adminStatus: "ADMIN_APPROVED",
        status: "APPLIED",
      },
    }),
    prisma.jobApplication.count({
      where: {
        job: { businessId: context.businessUserId },
        adminStatus: "ADMIN_APPROVED",
        status: { in: ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"] },
      },
    }),
    prisma.jobApplication.count({
      where: {
        job: { businessId: context.businessUserId },
        status: "INTERVIEW_SCHEDULED",
      },
    }),
    prisma.jobApplication.count({
      where: {
        job: { businessId: context.businessUserId },
        status: "JOINED",
      },
    }),
    prisma.jobApplication.findMany({
      where: {
        job: { businessId: context.businessUserId },
      },
      select: {
        id: true,
        status: true,
        managerStatus: true,
        adminStatus: true,
        createdAt: true,
        updatedAt: true,
        managerReviewedAt: true,
        adminReviewedAt: true,
        interviewAt: true,
        joinedAt: true,
        job: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
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

  const lockedBudget =
    (campaignLockedBudget._sum.remainingBudget ?? 0) + (jobLockedBudget._sum.lockedBudgetAmount ?? 0);
  const totalBudget = campaignBudgetTotals._sum.totalBudget ?? 0;
  const remainingBudget = campaignBudgetTotals._sum.remainingBudget ?? 0;
  const spentBudget = totalBudget - remainingBudget;
  const todaySpend = todayApprovals.reduce(
    (sum, submission) => sum + (submission.campaign?.rewardPerTask || 0),
    0
  );
  const averageCostPerApproval = approvedCount > 0 ? spentBudget / approvedCount : 0;
  const lowBalanceThreshold = Number(process.env.NEXT_PUBLIC_MIN_FUNDING_THRESHOLD ?? 500);

  const activityFeed = [
    ...recentCampaigns.map((campaign) => ({
      id: `campaign-${campaign.id}`,
      kind: "CAMPAIGN",
      message: `Campaign "${campaign.title}" is ${campaign.status.toLowerCase()}.`,
      createdAt: campaign.createdAt,
    })),
    ...recentApprovedSubmissions.map((submission, index) => ({
      id: `approval-${index}-${submission.createdAt.toISOString()}`,
      kind: "APPROVAL",
      message: `Submission approved for "${submission.campaign?.title || "Campaign"}".`,
      createdAt: submission.createdAt,
    })),
    ...recentJobs.map((job) => ({
      id: `job-${job.id}`,
      kind: "JOB",
      message: `Job "${job.title}" is ${job.status.toLowerCase().replaceAll("_", " ")}.`,
      createdAt: job.updatedAt || job.createdAt,
    })),
    ...recentJobApplications.map((application) => {
      const title = application.job?.title || "Job";
      const createdAt =
        application.joinedAt ||
        application.interviewAt ||
        application.adminReviewedAt ||
        application.managerReviewedAt ||
        application.updatedAt ||
        application.createdAt;

      const message =
        application.adminStatus !== "ADMIN_APPROVED"
          ? `Applicant for "${title}" is still in moderation.`
          : application.status === "APPLIED"
            ? `Verified applicant is ready for "${title}".`
            : application.status === "SHORTLISTED"
              ? `Applicant shortlisted for "${title}".`
              : application.status === "INTERVIEW_SCHEDULED"
                ? `Interview scheduled for "${title}".`
                : application.status === "HIRED"
                  ? `Candidate hired for "${title}".`
                  : application.status === "JOINED"
                    ? `Candidate joined "${title}".`
                    : `Application for "${title}" is ${application.status.toLowerCase().replaceAll("_", " ")}.`;

      return {
        id: `application-${application.id}`,
        kind: "APPLICATION",
        message,
        createdAt,
      };
    }),
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
    totalJobs,
    openJobs,
    pendingJobs,
    filledJobs,
    lockedBudget,
    totalBudget,
    remainingBudget,
    spentBudget,
    approvedSubmissions: approvedCount,
    pendingReviews,
    readyApplicants,
    activeApplicants,
    scheduledInterviews,
    joinedWorkers,
    todaySpend,
    averageCostPerApproval,
    fundingFeeRate: appSettings.fundingFeeRate,
    businessRefundFeeRate: appSettings.businessRefundFeeRate,
    activityFeed,
  });
}
