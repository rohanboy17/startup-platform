import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [counts, budgetAgg, approvedSubmissions] = await Promise.all([
    prisma.campaign.groupBy({
      by: ["status"],
      where: { businessId: session.user.id },
      _count: { _all: true },
    }),
    prisma.campaign.aggregate({
      where: { businessId: session.user.id },
      _sum: { totalBudget: true, remainingBudget: true },
    }),
    prisma.submission.count({
      where: {
        campaign: { businessId: session.user.id },
        adminStatus: "ADMIN_APPROVED",
      },
    }),
  ]);

  const totalCampaigns = counts.reduce((sum, item) => sum + item._count._all, 0);
  const liveCampaigns = counts.find((c) => c.status === "LIVE")?._count._all || 0;
  const pendingCampaigns = counts.find((c) => c.status === "PENDING")?._count._all || 0;

  return NextResponse.json({
    totalCampaigns,
    liveCampaigns,
    pendingCampaigns,
    approvedSubmissions,
    totalBudget: budgetAgg._sum.totalBudget || 0,
    remainingBudget: budgetAgg._sum.remainingBudget || 0,
  });
}
