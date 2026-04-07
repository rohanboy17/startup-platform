import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMinFundingThreshold } from "@/lib/notifications";
import { getBusinessContext } from "@/lib/business-context";

type AlertItem = {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING";
  createdAt: string;
};

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const now = new Date();
  const lowBalanceThreshold = getMinFundingThreshold();
  const pendingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const spikeCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          title: string;
          message: string;
          createdAt: Date;
          isRead: boolean;
          type: "INFO" | "SUCCESS" | "WARNING";
        }>
      >;
      count: (args: { where: { userId: string; isRead: boolean } }) => Promise<number>;
    };
  }).notification;

  const [business, campaigns, jobs, recentSubmissions, jobApplications, paymentOrders, notifications, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: context.businessUserId },
      select: { balance: true },
    }),
    prisma.campaign.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        status: true,
        rewardPerTask: true,
        remainingBudget: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobPosting.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reviewNote: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.submission.findMany({
      where: {
        campaign: { businessId: context.businessUserId },
        createdAt: { gte: spikeCutoff },
        adminStatus: { in: ["ADMIN_APPROVED", "ADMIN_REJECTED"] },
      },
      select: {
        campaignId: true,
        adminStatus: true,
        campaign: { select: { title: true } },
      },
    }),
    prisma.jobApplication.findMany({
      where: {
        job: { businessId: context.businessUserId },
      },
      select: {
        id: true,
        status: true,
        adminStatus: true,
        createdAt: true,
        updatedAt: true,
        adminReviewedAt: true,
        job: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.paymentOrder.findMany({
      where: { userId: context.businessUserId },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    notificationDelegate
      ? notificationDelegate.findMany({
          where: { userId: context.actorUserId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    notificationDelegate
      ? notificationDelegate.count({
          where: { userId: context.actorUserId, isRead: false },
        })
      : Promise.resolve(0),
  ]);

  const alerts: AlertItem[] = [];

  if ((business?.balance || 0) < lowBalanceThreshold) {
    alerts.push({
      id: "wallet-low",
      title: "Wallet balance is low",
      message: `Available wallet balance is below INR ${lowBalanceThreshold}. Add funds before launching or topping up campaigns.`,
      severity: "WARNING",
      createdAt: now.toISOString(),
    });
  }

  for (const campaign of campaigns) {
    if (campaign.status === "LIVE" && campaign.remainingBudget < campaign.rewardPerTask) {
      alerts.push({
        id: `budget-exhausted-${campaign.id}`,
        title: "Campaign budget exhausted",
        message: `Campaign "${campaign.title}" no longer has enough budget for the next approved result.`,
        severity: "WARNING",
        createdAt: now.toISOString(),
      });
    }

    if (campaign.status === "PENDING" && campaign.createdAt < pendingCutoff) {
      alerts.push({
        id: `pending-too-long-${campaign.id}`,
        title: "Campaign pending approval too long",
        message: `Campaign "${campaign.title}" has been pending review for more than 24 hours.`,
        severity: "WARNING",
        createdAt: campaign.createdAt.toISOString(),
      });
    }

    if (campaign.status === "COMPLETED" && campaign.createdAt >= recentCutoff) {
      alerts.push({
        id: `campaign-completed-${campaign.id}`,
        title: "Campaign completed",
        message: `Campaign "${campaign.title}" is marked completed.`,
        severity: "INFO",
        createdAt: campaign.createdAt.toISOString(),
      });
    }
  }

  for (const job of jobs) {
    if (job.status === "PENDING_REVIEW" && job.createdAt < pendingCutoff) {
      alerts.push({
        id: `job-pending-too-long-${job.id}`,
        title: "Job pending approval too long",
        message: `Job "${job.title}" has been waiting for admin review for more than 24 hours.`,
        severity: "WARNING",
        createdAt: job.createdAt.toISOString(),
      });
    }

    if (job.status === "REJECTED") {
      alerts.push({
        id: `job-rejected-${job.id}`,
        title: "Job needs changes before relaunch",
        message: job.reviewNote
          ? `Job "${job.title}" was rejected. Admin note: ${job.reviewNote}`
          : `Job "${job.title}" was rejected and should be updated before resubmission.`,
        severity: "WARNING",
        createdAt: (job.updatedAt || job.createdAt).toISOString(),
      });
    }
  }

  const failedPayments = paymentOrders.filter((order) => order.status === "FAILED");
  for (const order of failedPayments.slice(0, 5)) {
    alerts.push({
      id: `payment-failed-${order.id}`,
      title: "Payment failed",
      message: `A funding payment of INR ${order.amount.toFixed(2)} failed. Retry the top-up if balance is still needed.`,
      severity: "WARNING",
      createdAt: order.updatedAt.toISOString(),
    });
  }

  const spikeMap = new Map<string, { title: string; total: number; rejected: number }>();
  for (const submission of recentSubmissions) {
    const key = submission.campaignId || "unknown";
    const current = spikeMap.get(key) || {
      title: submission.campaign?.title || "Campaign",
      total: 0,
      rejected: 0,
    };
    current.total += 1;
    if (submission.adminStatus === "ADMIN_REJECTED") current.rejected += 1;
    spikeMap.set(key, current);
  }

  for (const [campaignId, value] of spikeMap.entries()) {
    const rejectionRate = value.total > 0 ? (value.rejected / value.total) * 100 : 0;
    if (value.total >= 5 && rejectionRate >= 50) {
      alerts.push({
        id: `rejection-spike-${campaignId}`,
        title: "Rejection spike detected",
        message: `${value.title} has a ${rejectionRate.toFixed(0)}% rejection rate in the last 24 hours.`,
        severity: "WARNING",
        createdAt: now.toISOString(),
      });
    }
  }

  const readyApplicants = jobApplications.filter(
    (application) => application.adminStatus === "ADMIN_APPROVED" && application.status === "APPLIED"
  );
  if (readyApplicants.length > 0) {
    const latestReadyApplicant = readyApplicants[0];
    alerts.push({
      id: "verified-applicants-ready",
      title: "Verified applicants are waiting",
      message:
        readyApplicants.length === 1
          ? `1 verified applicant is waiting in Jobs for "${latestReadyApplicant.job?.title || "a job"}".`
          : `${readyApplicants.length} verified applicants are waiting in Jobs for business action.`,
      severity: "INFO",
      createdAt: (
        latestReadyApplicant.adminReviewedAt ||
        latestReadyApplicant.updatedAt ||
        latestReadyApplicant.createdAt
      ).toISOString(),
    });
  }

  alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({
    activeAlerts: alerts,
    inbox:
      notifications?.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        createdAt: item.createdAt.toISOString(),
        isRead: item.isRead,
        type: item.type,
      })) || [],
    counts: {
      activeAlerts: alerts.length,
      unreadInbox: unreadCount,
    },
  });
}
