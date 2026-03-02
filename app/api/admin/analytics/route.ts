import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const platformEarning = (prisma as unknown as {
      platformEarning?: {
        aggregate: (args: { _sum: { amount: true } }) => Promise<{ _sum: { amount: number | null } }>;
      };
    }).platformEarning;

    const [
      totalUsers,
      totalBusinesses,
      totalTasks,
      activeTasks,
      pendingTasks,
      totalSubmissions,
      pendingSubmissions,
      totalWithdrawals,
      pendingWithdrawals,
      treasury,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "BUSINESS" } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({ where: { status: "PENDING" } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: "PENDING" } }),
      prisma.withdrawal.count(),
      prisma.withdrawal.count({ where: { status: "PENDING" } }),
      prisma.platformTreasury.upsert({
        where: { id: "main" },
        update: {},
        create: { id: "main", balance: 0 },
      }),
    ]);

    const platformRevenue = platformEarning
      ? await platformEarning.aggregate({
        _sum: { amount: true },
      })
      : { _sum: { amount: 0 } };

    return NextResponse.json({
      users: totalUsers,
      businesses: totalBusinesses,
      tasks: {
        total: totalTasks,
        active: activeTasks,
        pending: pendingTasks,
      },
      submissions: {
        total: totalSubmissions,
        pending: pendingSubmissions,
      },
      withdrawals: {
        total: totalWithdrawals,
        pending: pendingWithdrawals,
      },
      platformRevenue: platformRevenue._sum.amount || 0,
      treasuryBalance: treasury.balance,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
