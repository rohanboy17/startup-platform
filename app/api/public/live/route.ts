import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LiveEvent = {
  kind: "USER" | "BUSINESS" | "TASK" | "WITHDRAW";
  message: string;
  createdAt: string;
};

export async function GET() {
  try {
    const activityCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const eventsCutoff = new Date(Date.now() - 60 * 60 * 1000);

    const [users, businesses, tasks, withdrawals, recentActivity, liveTasks, liveJobs, liveWithdraws] =
      await Promise.all([
        prisma.user.findMany({
          where: { role: "USER", createdAt: { gte: eventsCutoff } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { createdAt: true },
        }),
        prisma.user.findMany({
          where: { role: "BUSINESS", createdAt: { gte: eventsCutoff } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { createdAt: true },
        }),
        prisma.campaign.findMany({
          where: { createdAt: { gte: eventsCutoff } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { createdAt: true },
        }),
        prisma.withdrawal.findMany({
          where: { createdAt: { gte: eventsCutoff } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { amount: true, createdAt: true },
        }),
        prisma.activityLog.findMany({
          where: {
            userId: { not: null },
            createdAt: { gte: activityCutoff },
          },
          select: { userId: true },
          take: 300,
          orderBy: { createdAt: "desc" },
        }),
        prisma.campaign.count({
          where: {
            status: "LIVE",
          },
        }),
        prisma.jobPosting.count({
          where: {
            status: "OPEN",
          },
        }),
        prisma.withdrawal.count({
          where: {
            status: "PENDING",
          },
        }),
      ]);

    const recentActiveUserIds = Array.from(
      new Set(recentActivity.map((item) => item.userId).filter((id): id is string => Boolean(id)))
    );

    const [activeOnlineUsers, activeOnlineBusinesses] = recentActiveUserIds.length
      ? await Promise.all([
          prisma.user.count({
            where: {
              id: { in: recentActiveUserIds },
              role: "USER",
            },
          }),
          prisma.user.count({
            where: {
              id: { in: recentActiveUserIds },
              role: "BUSINESS",
            },
          }),
        ])
      : [0, 0];

    const events: LiveEvent[] = [
      ...users.map((item) => ({
        kind: "USER" as const,
        message: "A new user joined the platform",
        createdAt: item.createdAt.toISOString(),
      })),
      ...businesses.map((item) => ({
        kind: "BUSINESS" as const,
        message: "A business account was created",
        createdAt: item.createdAt.toISOString(),
      })),
      ...tasks.map((item) => ({
        kind: "TASK" as const,
        message: "A campaign was launched",
        createdAt: item.createdAt.toISOString(),
      })),
      ...withdrawals.map((item) => ({
        kind: "WITHDRAW" as const,
        message: `A user requested withdrawal of INR ${item.amount.toFixed(2)}`,
        createdAt: item.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);

    return NextResponse.json({
      stats: {
        activeOnlineUsers,
        activeOnlineBusinesses,
        liveTasks,
        liveJobs,
        liveWithdraws,
      },
      events,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load live activity" }, { status: 500 });
  }
}
