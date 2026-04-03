import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalPayout, totalUsers, businessAccounts, totalCampaigns, tasksCompleted] = await Promise.all([
      prisma.withdrawal.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "BUSINESS" } }),
      prisma.campaign.count(),
      prisma.submission.count({
        where: { adminStatus: { in: ["ADMIN_APPROVED", "APPROVED"] } },
      }),
    ]);

    const metrics = {
      totalPayout: Math.round(totalPayout._sum.amount || 0),
      totalUsers,
      businessAccounts,
      totalCampaigns,
      tasksCompleted,
    };

    return NextResponse.json({
      ...metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load hero metrics" }, { status: 500 });
  }
}
