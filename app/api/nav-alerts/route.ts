import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
            where: { role: "BUSINESS", kycStatus: "PENDING" },
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
        ]);

      const tabs = {
        "admin.campaigns": token(pendingCampaigns.length, pendingCampaigns[0]?.createdAt),
        "admin.risk": token(
          escalatedCampaigns.length + riskyWithdrawals.length + flaggedUsers.length,
          maxDate(
            escalatedCampaigns[0]?.escalatedAt || escalatedCampaigns[0]?.createdAt,
            riskyWithdrawals[0]?.createdAt,
            flaggedUsers[0]?.flaggedAt || flaggedUsers[0]?.createdAt
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
          earnings.length + payouts.length,
          maxDate(earnings[0]?.createdAt, payouts[0]?.createdAt, payouts[0]?.processedAt)
        ),
        "admin.audit": token(audits.length, audits[0]?.createdAt),
      };

      return NextResponse.json({
        role,
        tabs: {
          "admin.overview": Object.values(tabs).join("|"),
          ...tabs,
        },
        counts: {
          "admin.risk": escalatedCampaigns.length + riskyWithdrawals.length + flaggedUsers.length,
        },
      });
    }

    if (role === "BUSINESS") {
      const [campaigns, submissions, txs, payments] = await Promise.all([
        prisma.campaign.findMany({
          where: { businessId: userId },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.submission.findMany({
          where: { campaign: { businessId: userId } },
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
        prisma.paymentOrder.findMany({
          where: { userId },
          select: { createdAt: true, updatedAt: true, paidAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);

      const tabs = {
        "business.campaigns": token(campaigns.length, campaigns[0]?.createdAt),
        "business.create": token(0, null),
        "business.analytics": token(submissions.length, submissions[0]?.createdAt),
        "business.funding": token(
          txs.length + payments.length,
          maxDate(txs[0]?.createdAt, payments[0]?.createdAt, payments[0]?.updatedAt, payments[0]?.paidAt)
        ),
      };

      return NextResponse.json({
        role,
        tabs: {
          "business.overview": Object.values(tabs).join("|"),
          ...tabs,
        },
        counts: {},
      });
    }

    if (role === "MANAGER") {
      const [queue, audits] = await Promise.all([
        prisma.submission.findMany({
          where: { managerStatus: "PENDING" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.auditLog.findMany({
          where: { actorUserId: userId },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      const tabs = {
        "manager.submissions": token(queue.length, queue[0]?.createdAt),
      };

      return NextResponse.json({
        role,
        tabs: {
          "manager.overview": `${Object.values(tabs).join("|")}|${token(audits.length, audits[0]?.createdAt)}`,
          ...tabs,
        },
        counts: {},
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
