import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "LIVE",
      remainingBudget: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      taskLink: true,
      rewardPerTask: true,
      remainingBudget: true,
      totalBudget: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const occupiedCounts = campaignIds.length
    ? await prisma.submission.groupBy({
        by: ["campaignId"],
        where: {
          campaignId: { in: campaignIds },
          NOT: [
            { managerStatus: "MANAGER_REJECTED" },
            { adminStatus: "ADMIN_REJECTED" },
            { status: "REJECTED" },
          ],
        },
        _count: { _all: true },
      })
    : [];

  const occupiedCountMap = new Map(
    occupiedCounts.map((item) => [item.campaignId, item._count._all])
  );

  const campaignsWithLimits = campaigns.map((campaign) => {
    const allowedSubmissions = Math.max(
      1,
      Math.floor(campaign.totalBudget / campaign.rewardPerTask)
    );
    const occupiedSubmissions = occupiedCountMap.get(campaign.id) ?? 0;
    const leftSubmissions = Math.max(0, allowedSubmissions - occupiedSubmissions);

    return {
      ...campaign,
      allowedSubmissions,
      usedSubmissions: occupiedSubmissions,
      leftSubmissions,
    };
  });

  const visibleCampaigns = campaignsWithLimits.filter(
    (campaign) => campaign.leftSubmissions > 0
  );

  return NextResponse.json({ campaigns: visibleCampaigns });
}
