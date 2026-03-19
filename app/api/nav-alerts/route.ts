import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

type DashboardRole = "USER" | "BUSINESS" | "MANAGER" | "ADMIN";

function token(count: number, latest: Date | null | undefined) {
  return `${count}:${latest ? latest.getTime() : 0}`;
}

function maxDate(...dates: Array<Date | null | undefined>) {
  return dates.reduce<Date | null>((acc, curr) => {
    if (!curr) return acc;
    if (!acc) return curr;
    return curr.getTime() > acc.getTime() ? curr : acc;
  }, null);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as DashboardRole;
  const userId = session.user.id;

  try {
    if (role === "ADMIN") {
      const [
        pendingCampaigns,
        reviewSubmissions,
        usersTotal,
        businessesPendingKyc,
        pendingWithdrawals,
        earnings,
        payouts,
        audits,
        escalatedCampaigns,
        riskyWithdrawals,
        flaggedUsers,
        pendingAdjustments,
        openSecurityEvents,
        unreadAdminNotifications,
        latestUnreadAdminNotification,
        legalEvidence,
      ] =
        await Promise.all([
          prisma.campaign.findMany({
            where: { status: "PENDING" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.submission.findMany({
            where: { managerStatus: "MANAGER_APPROVED", adminStatus: "PENDING" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.user.findMany({
            select: { createdAt: true, flaggedAt: true },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.user.findMany({
            where: { role: "BUSINESS", businessOwnerId: null, kycStatus: "PENDING" },
            select: { createdAt: true, statusUpdatedAt: true },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.withdrawal.findMany({
            where: { status: "PENDING" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.platformEarning.findMany({
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.platformPayout.findMany({
            select: { createdAt: true, processedAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.auditLog.findMany({
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.campaign.findMany({
            where: { status: "PENDING", escalatedAt: { not: null } },
            select: { escalatedAt: true, createdAt: true },
            orderBy: { escalatedAt: "desc" },
            take: 100,
          }),
          prisma.withdrawal.findMany({
            where: { status: "PENDING", amount: { gte: Number(process.env.RISK_WITHDRAWAL_ALERT_AMOUNT ?? 3000) } },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.user.findMany({
            where: { isSuspicious: true },
            select: { flaggedAt: true, createdAt: true },
            orderBy: { flaggedAt: "desc" },
            take: 100,
          }),
          prisma.walletAdjustmentRequest.findMany({
            where: { status: "PENDING" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.securityEvent.findMany({
            where: { status: "OPEN" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
          prisma.notification.count({
            where: { userId, isRead: false },
          }),
          prisma.notification.findFirst({
            where: { userId, isRead: false },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
          }),
          prisma.legalEvidence.findMany({
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        ]);

      const tabs = {
        "admin.campaigns": token(pendingCampaigns.length, pendingCampaigns[0]?.createdAt),
        "admin.risk": token(
          escalatedCampaigns.length + riskyWithdrawals.length + flaggedUsers.length + openSecurityEvents.length,
          maxDate(
            escalatedCampaigns[0]?.escalatedAt || escalatedCampaigns[0]?.createdAt,
            riskyWithdrawals[0]?.createdAt,
            flaggedUsers[0]?.flaggedAt || flaggedUsers[0]?.createdAt,
            openSecurityEvents[0]?.createdAt
          )
        ),
        "admin.reviews": token(reviewSubmissions.length, reviewSubmissions[0]?.createdAt),
        "admin.users": token(usersTotal.length, maxDate(usersTotal[0]?.createdAt, usersTotal[0]?.flaggedAt)),
        "admin.businesses": token(
          businessesPendingKyc.length,
          maxDate(businessesPendingKyc[0]?.createdAt, businessesPendingKyc[0]?.statusUpdatedAt)
        ),
        "admin.withdrawals": token(pendingWithdrawals.length, pendingWithdrawals[0]?.createdAt),
        "admin.revenue": token(
          earnings.length + payouts.length + pendingAdjustments.length,
          maxDate(
            earnings[0]?.createdAt,
            payouts[0]?.createdAt,
            payouts[0]?.processedAt,
            pendingAdjustments[0]?.createdAt
          )
        ),
        "admin.audit": token(audits.length, audits[0]?.createdAt),
        "admin.cms": token(0, null),
        "admin.notifications": token(unreadAdminNotifications, latestUnreadAdminNotification?.createdAt),
        "admin.settings": token(0, null),
        "admin.compliance": token(legalEvidence.length, legalEvidence[0]?.createdAt),
      };

      return NextResponse.json({
        role,
        tabs: {
          "admin.overview": Object.values(tabs).join("|"),
          ...tabs,
        },
        counts: {
          "admin.risk":
            escalatedCampaigns.length + riskyWithdrawals.length + flaggedUsers.length + openSecurityEvents.length,
          "admin.revenue": pendingAdjustments.length,
          "admin.notifications": unreadAdminNotifications,
          "admin.compliance": legalEvidence.length,
        },
      });
    }

    if (role === "BUSINESS") {
      const context = await getBusinessContext(userId);
      if (!context) {
        return NextResponse.json({ error: "Business context not found" }, { status: 404 });
      }
      const [
        campaigns,
        submissions,
        txs,
        payments,
        unreadNotifications,
        liveCampaigns,
        breachedPendingCampaigns,
        businessProfile,
        latestKycRequest,
      ] = await Promise.all([
        prisma.campaign.findMany({
          where: { businessId: context.businessUserId },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.submission.findMany({
          where: { campaign: { businessId: context.businessUserId } },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.walletTransaction.findMany({
          where: { userId: context.businessUserId },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.paymentOrder.findMany({
          where: { userId: context.businessUserId },
          select: { createdAt: true, updatedAt: true, paidAt: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.notification.count({
          where: { userId: context.actorUserId, isRead: false },
        }),
        prisma.campaign.findMany({
          where: { businessId: context.businessUserId, status: "LIVE" },
          select: {
            createdAt: true,
            remainingBudget: true,
            rewardPerTask: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.campaign.findMany({
          where: {
            businessId: context.businessUserId,
            status: "PENDING",
            createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.user.findUnique({
          where: { id: context.businessUserId },
          select: { kycStatus: true, createdAt: true, kycVerifiedAt: true },
        }),
        prisma.businessKycRequest.findFirst({
          where: { businessId: context.businessUserId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

      const exhaustedLiveCampaigns = liveCampaigns.filter(
        (campaign) => campaign.remainingBudget < campaign.rewardPerTask
      ).length;
      const failedPayments = payments.filter((item) => item.status === "FAILED").length;
      const activeAlertCount = exhaustedLiveCampaigns + breachedPendingCampaigns.length + failedPayments;

      const tabs = {
        "business.campaigns": token(campaigns.length, campaigns[0]?.createdAt),
        "business.reviews": token(submissions.length, submissions[0]?.createdAt),
        "business.create": token(0, null),
        "business.analytics": token(submissions.length, submissions[0]?.createdAt),
        "business.kyc": token(
          businessProfile?.kycStatus === "VERIFIED" ? 0 : 1,
          maxDate(
            businessProfile?.kycVerifiedAt,
            latestKycRequest?.createdAt,
            latestKycRequest?.updatedAt,
            businessProfile?.createdAt
          )
        ),
        "business.funding": token(
          txs.length + payments.length,
          maxDate(txs[0]?.createdAt, payments[0]?.createdAt, payments[0]?.updatedAt, payments[0]?.paidAt)
        ),
        "business.notifications": token(
          unreadNotifications + activeAlertCount,
          maxDate(
            campaigns[0]?.createdAt,
            submissions[0]?.createdAt,
            txs[0]?.createdAt,
            payments[0]?.updatedAt,
            payments[0]?.createdAt
          )
        ),
        "business.trust": token(
          breachedPendingCampaigns.length + failedPayments,
          maxDate(campaigns[0]?.createdAt, payments[0]?.updatedAt, payments[0]?.createdAt)
        ),
        "business.activity": token(
          campaigns.length + submissions.length + txs.length + payments.length,
          maxDate(
            campaigns[0]?.createdAt,
            submissions[0]?.createdAt,
            txs[0]?.createdAt,
            payments[0]?.updatedAt,
            payments[0]?.createdAt
          )
        ),
        "business.team": token(0, null),
        "business.settings": token(0, null),
      };

      return NextResponse.json({
        role,
        tabs: {
          "business.overview": Object.values(tabs).join("|"),
          ...tabs,
        },
        counts: {
          "business.notifications": unreadNotifications + activeAlertCount,
          "business.kyc": businessProfile?.kycStatus === "VERIFIED" ? 0 : 1,
        },
      });
    }

    if (role === "MANAGER") {
      const [queue, suspiciousQueue, decisions, openSecurityEvents, unreadManagerNotifications, latestUnreadManagerNotification] = await Promise.all([
        prisma.submission.findMany({
          where: { managerStatus: "PENDING", managerEscalatedAt: null },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.submission.findMany({
          where: { managerStatus: "PENDING", managerEscalatedAt: null, user: { isSuspicious: true } },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.activityLog.findMany({
          where: {
            userId,
            entity: "Submission",
            action: { in: ["MANAGER_APPROVED_SUBMISSION", "MANAGER_REJECTED_SUBMISSION", "MANAGER_ESCALATED_SUBMISSION"] },
          },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.securityEvent.findMany({
          where: { status: "OPEN", kind: { startsWith: "MANAGER_" } },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
        prisma.notification.findFirst({
          where: { userId, isRead: false },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const tabs = {
        "manager.submissions": token(queue.length, queue[0]?.createdAt),
        "manager.history": token(decisions.length, decisions[0]?.createdAt),
        "manager.risk": token(
          suspiciousQueue.length + openSecurityEvents.length,
          maxDate(suspiciousQueue[0]?.createdAt, openSecurityEvents[0]?.createdAt)
        ),
        "manager.notifications": token(unreadManagerNotifications, latestUnreadManagerNotification?.createdAt),
      };

      return NextResponse.json({
        role,
        tabs: {
          "manager.overview": Object.values(tabs).join("|"),
          ...tabs,
        },
        counts: {
          "manager.notifications": unreadManagerNotifications,
        },
      });
    }

    const [liveCampaigns, submissions, txs, withdrawals, notifications] = await Promise.all([
      prisma.campaign.findMany({
        where: { status: "LIVE" },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.submission.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.walletTransaction.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { createdAt: true, isRead: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const unread = notifications.filter((n) => !n.isRead).length;
    const tabs = {
      "user.tasks": token(liveCampaigns.length, liveCampaigns[0]?.createdAt),
      "user.submissions": token(submissions.length, maxDate(submissions[0]?.createdAt, notifications[0]?.createdAt)),
      "user.wallet": token(txs.length, txs[0]?.createdAt),
      "user.withdrawals": token(withdrawals.length, maxDate(withdrawals[0]?.createdAt, notifications[0]?.createdAt)),
      "user.notifications": token(unread, notifications[0]?.createdAt),
    };

    return NextResponse.json({
      role,
      tabs: {
        "user.overview": Object.values(tabs).join("|"),
        ...tabs,
      },
      counts: {
        "user.notifications": unread,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load nav alerts" }, { status: 500 });
  }
}
