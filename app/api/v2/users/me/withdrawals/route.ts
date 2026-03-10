import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [user, withdrawals, pendingAmount, approvedAmount, rejectedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        balance: true,
        monthlyEmergencyWithdrawCount: true,
        emergencyWithdrawMonthKey: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawal.aggregate({
      where: { userId: session.user.id, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { userId: session.user.id, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.withdrawal.count({
      where: { userId: session.user.id, status: "REJECTED" },
    }),
  ]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const usedEmergencyCount =
    user?.emergencyWithdrawMonthKey === currentMonthKey ? user.monthlyEmergencyWithdrawCount : 0;

  return NextResponse.json({
    balance: user?.balance ?? 0,
    metrics: {
      pendingAmount: pendingAmount._sum.amount ?? 0,
      approvedAmount: approvedAmount._sum.amount ?? 0,
      rejectedCount,
      totalRequests: withdrawals.length,
      emergencyRemaining: Math.max(0, 2 - usedEmergencyCount),
      emergencyUsed: usedEmergencyCount,
    },
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      upiId: w.upiId,
      upiName: w.upiName,
      status: w.status,
      adminNote: w.adminNote,
      isEmergency: w.isEmergency,
      createdAt: w.createdAt.toISOString(),
    })),
  });
}
