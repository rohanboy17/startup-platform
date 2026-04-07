import { NextResponse } from "next/server";
import type { UserLevel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MARKETING_COMMISSION_BY_LEVEL, PHYSICAL_WORK_COMMISSION_RATE } from "@/lib/commission";
import { LEVEL_BENEFIT_STEPS, getDailyResetState } from "@/lib/level";
import { getAppSettings } from "@/lib/system-settings";
import { getWorkExperienceMap } from "@/lib/work-experience";

function levelTarget(level: string) {
  switch (level) {
    case "L1":
      return 10;
    case "L2":
      return 20;
    case "L3":
      return 30;
    case "L4":
      return 40;
    default:
      return null;
  }
}

function levelProgress(dailyApproved: number, level: string) {
  if (level === "L5") {
    return { current: dailyApproved, target: null, percent: 100 };
  }

  const floor =
    level === "L4" ? 30 :
    level === "L3" ? 20 :
    level === "L2" ? 10 :
    0;
  const target = levelTarget(level);
  const span = Math.max(1, (target ?? dailyApproved) - floor);
  const percent = Math.max(0, Math.min(100, Math.round(((dailyApproved - floor) / span) * 100)));

  return {
    current: dailyApproved,
    target,
    percent,
  };
}

function makeActivityItems(input: {
  transactions: Array<{ id: string; createdAt: Date; note: string | null; type: "CREDIT" | "DEBIT"; amount: number }>;
  withdrawals: Array<{ id: string; createdAt: Date; status: string; amount: number }>;
  submissions: Array<{ id: string; createdAt: Date; adminStatus: string; campaign: { title: string } | null }>;
  jobApplications: Array<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    interviewAt: Date | null;
    joinedAt: Date | null;
    job: { title: string } | null;
  }>;
}) {
  const txItems = input.transactions.map((tx) => ({
    id: `tx-${tx.id}`,
    createdAt: tx.createdAt,
    kind: tx.type === "CREDIT" ? "EARNING" : "WALLET",
    message:
      tx.type === "CREDIT"
        ? `${tx.note || "Wallet credit"} for INR ${tx.amount.toFixed(2)}`
        : `${tx.note || "Wallet debit"} for INR ${tx.amount.toFixed(2)}`,
  }));

  const withdrawalItems = input.withdrawals.map((withdrawal) => ({
    id: `withdrawal-${withdrawal.id}`,
    createdAt: withdrawal.createdAt,
    kind: "WITHDRAWAL",
    message: `Withdrawal request of INR ${withdrawal.amount.toFixed(2)} is ${withdrawal.status.toLowerCase()}`,
  }));

  const submissionItems = input.submissions.map((submission) => ({
    id: `submission-${submission.id}`,
    createdAt: submission.createdAt,
    kind: "SUBMISSION",
    message: `${submission.campaign?.title || "Campaign"} submission is ${submission.adminStatus.toLowerCase().replaceAll("_", " ")}`,
  }));

  const jobItems = input.jobApplications.map((application) => {
    const title = application.job?.title || "Job";
    const activityAt =
      application.joinedAt ||
      application.interviewAt ||
      application.updatedAt ||
      application.createdAt;

    const message =
      application.status === "APPLIED"
        ? `Application sent for ${title}`
        : application.status === "SHORTLISTED"
          ? `You were shortlisted for ${title}`
          : application.status === "INTERVIEW_SCHEDULED"
            ? `Interview scheduled for ${title}`
            : application.status === "HIRED"
              ? `You were marked hired for ${title}`
              : application.status === "JOINED"
                ? `You joined ${title}`
                : application.status === "WITHDRAWN"
                  ? `You withdrew your application for ${title}`
                  : `Application for ${title} is ${application.status.toLowerCase().replaceAll("_", " ")}`;

    return {
      id: `job-${application.id}`,
      createdAt: activityAt,
      kind: "JOB",
      message,
    };
  });

  return [...txItems, ...withdrawalItems, ...submissionItems, ...jobItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      kind: item.kind,
      message: item.message,
    }));
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const userId = session.user.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const notificationDelegate = (prisma as unknown as {
    notification?: {
      count: (args: { where: { userId: string; isRead?: boolean } }) => Promise<number>;
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<Array<{ id: string; title: string; message: string; createdAt: Date; isRead: boolean; type: string }>>;
    };
  }).notification;

  const walletTransactionDelegate = (prisma as unknown as {
    walletTransaction?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<Array<{ id: string; createdAt: Date; note: string | null; type: "CREDIT" | "DEBIT"; amount: number }>>;
    };
  }).walletTransaction;

  const [
    user,
    appSettings,
    pendingWithdrawalAmount,
    totalWithdrawn,
    approvedSubmissions,
    todayApprovedCount,
    activeJobApplications,
    unreadNotifications,
    recentNotifications,
    recentTransactions,
    recentWithdrawals,
    recentSubmissions,
    recentJobApplications,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        coinBalance: true,
        perkCreditBalance: true,
        level: true,
        dailyApproved: true,
        lastLevelResetAt: true,
        totalApproved: true,
        dailySubmits: true,
      },
    }),
    getAppSettings(),
    prisma.withdrawal.aggregate({
      where: { userId, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { userId, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.submission.count({
      where: {
        userId,
        adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] },
      },
    }),
    prisma.submission.count({
      where: {
        userId,
        adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] },
        createdAt: { gte: todayStart },
      },
    }),
    prisma.jobApplication.count({
      where: {
        userId,
        status: { in: ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"] },
      },
    }),
    notificationDelegate?.count({ where: { userId, isRead: false } }) ?? Promise.resolve(0),
    notificationDelegate?.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }) ?? Promise.resolve([]),
    walletTransactionDelegate?.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }) ?? Promise.resolve([]),
    prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, amount: true, status: true, createdAt: true },
    }),
    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        adminStatus: true,
        campaign: { select: { title: true } },
      },
    }),
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        interviewAt: true,
        joinedAt: true,
        job: { select: { title: true } },
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { resetNeeded } = getDailyResetState(user.lastLevelResetAt);
  const effectiveLevel = resetNeeded ? "L1" : user.level;
  const effectiveDailyApproved = resetNeeded ? 0 : user.dailyApproved;
  const effectiveDailySubmits = resetNeeded ? 0 : user.dailySubmits;
  const progress = levelProgress(effectiveDailyApproved, effectiveLevel);
  const workCommissionRate = appSettings.commissionRateDefault;
  const levelBenefits = LEVEL_BENEFIT_STEPS.map((step) => {
    const commissionRate = MARKETING_COMMISSION_BY_LEVEL[step.level];
    return {
      ...step,
      commissionRate,
      walletShareRate: Number((1 - commissionRate).toFixed(2)),
      isCurrent: step.level === effectiveLevel,
    };
  });
  const experience = (await getWorkExperienceMap([userId])).get(userId);

  return NextResponse.json({
    profile: {
      displayName: user.name?.trim() || user.email,
      level: effectiveLevel,
      balance: user.balance,
      coinBalance: user.coinBalance,
      perkCreditBalance: user.perkCreditBalance,
      totalApproved: user.totalApproved,
      dailyApproved: effectiveDailyApproved,
      dailySubmits: effectiveDailySubmits,
    },
    metrics: {
      availableBalance: user.balance,
      coinBalance: user.coinBalance,
      perkCreditBalance: user.perkCreditBalance,
      pendingWithdrawalAmount: pendingWithdrawalAmount._sum.amount ?? 0,
      totalWithdrawn: totalWithdrawn._sum.amount ?? 0,
      approvedSubmissions,
      todayApprovedCount,
      activeJobApplications,
      unreadNotifications,
    },
    progress,
    levelBenefits,
    levelSystem: {
      currentLevel: effectiveLevel as UserLevel,
      marketingShareRate: Number((1 - MARKETING_COMMISSION_BY_LEVEL[effectiveLevel as UserLevel]).toFixed(2)),
      fixedWorkShareRate: Number((1 - workCommissionRate).toFixed(2)),
      physicalWorkShareRate: Number((1 - PHYSICAL_WORK_COMMISSION_RATE).toFixed(2)),
    },
    experience,
    recentNotifications: recentNotifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
    })),
    recentActivity: makeActivityItems({
      transactions: recentTransactions,
      withdrawals: recentWithdrawals,
      submissions: recentSubmissions,
      jobApplications: recentJobApplications,
    }),
  });
}
