import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubmissionCommissionRate } from "@/lib/commission";
import { getDailyResetState } from "@/lib/level";
import { prisma } from "@/lib/prisma";
import { getCampaignRepeatAccess, getIndiaDateKey } from "@/lib/campaign-repeat";
import { getAppSettings } from "@/lib/system-settings";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [user, appSettings, campaigns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        level: true,
        lastLevelResetAt: true,
      },
    }),
    getAppSettings(),
    prisma.campaign.findMany({
      where: {
        status: "LIVE",
        remainingBudget: { gt: 0 },
        OR: [
          { category: "marketing" },
          {
            AND: [
              { category: "work" },
              { assignments: { some: { userId: session.user.id } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        taskCategory: true,
        taskType: true,
        customTask: true,
        taskLink: true,
        rewardPerTask: true,
        remainingBudget: true,
        totalBudget: true,
        submissionMode: true,
        repeatAccessMode: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { resetNeeded } = getDailyResetState(user.lastLevelResetAt);
  const effectiveLevel = resetNeeded ? "L1" : user.level;

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const todayKey = getIndiaDateKey();
  const [occupiedCounts, userSubmissionCounts, repeatRequests, userPlatformSubmissionCount] = campaignIds.length
    ? await Promise.all([
        prisma.submission.groupBy({
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
        }),
        prisma.submission.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: { in: campaignIds },
            userId: session.user.id,
          },
          _count: { _all: true },
        }),
        prisma.campaignRepeatRequest.findMany({
          where: {
            campaignId: { in: campaignIds },
            userId: session.user.id,
            requestDateKey: todayKey,
          },
          select: {
            campaignId: true,
            status: true,
          },
        }),
        prisma.submission.count({
          where: {
            userId: session.user.id,
          },
        }),
      ])
    : [[], [], [], 0];

  const occupiedCountMap = new Map(
    occupiedCounts.map((item) => [item.campaignId, item._count._all])
  );
  const userSubmissionCountMap = new Map(
    userSubmissionCounts.map((item) => [item.campaignId, item._count._all])
  );
  const repeatRequestStatusMap = new Map(
    repeatRequests.map((item) => [item.campaignId, item.status])
  );

  const campaignsWithLimits = campaigns.map((campaign) => {
    const commissionRate = getSubmissionCommissionRate({
      category: campaign.category,
      userLevel: effectiveLevel,
      oneTimeRateOverride: appSettings.commissionRateDefault,
    });
    const walletShareRate = Number((1 - commissionRate).toFixed(2));
    const allowedSubmissions = Math.max(
      1,
      Math.floor(campaign.totalBudget / campaign.rewardPerTask)
    );
    const occupiedSubmissions = occupiedCountMap.get(campaign.id) ?? 0;
    const leftSubmissions = Math.max(0, allowedSubmissions - occupiedSubmissions);
    const userSubmissionCount = userSubmissionCountMap.get(campaign.id) ?? 0;
    const blockedBySubmissionMode =
      campaign.submissionMode === "ONE_PER_USER" && userSubmissionCount > 0;
    const repeatAccess = getCampaignRepeatAccess({
      submissionMode: campaign.submissionMode,
      repeatAccessMode: campaign.repeatAccessMode,
      userSubmissionCount,
      userPlatformSubmissionCount,
      repeatRequestStatus: repeatRequestStatusMap.get(campaign.id) ?? null,
    });
    const netRewardPerTask = Number((campaign.rewardPerTask * walletShareRate).toFixed(2));
    const netRemainingBudget = Number((leftSubmissions * netRewardPerTask).toFixed(2));
    const netTotalBudget = Number((allowedSubmissions * netRewardPerTask).toFixed(2));

    return {
      ...campaign,
      allowedSubmissions,
      usedSubmissions: occupiedSubmissions,
      leftSubmissions,
      userSubmissionCount,
      blockedBySubmissionMode: blockedBySubmissionMode || repeatAccess.blockedByRepeatRule,
      blockedByRepeatRule: repeatAccess.blockedByRepeatRule,
      repeatRequestStatus: repeatRequestStatusMap.get(campaign.id) ?? null,
      repeatAccessMode: campaign.repeatAccessMode,
      repeatRequestReason: repeatAccess.reason,
      submissionMode: campaign.submissionMode,
      effectiveLevel,
      commissionRate,
      walletShareRate,
      netRewardPerTask,
      netRemainingBudget,
      netTotalBudget,
    };
  });

  const visibleCampaigns = campaignsWithLimits.filter(
    (campaign) => campaign.leftSubmissions > 0
  );

  return NextResponse.json({ campaigns: visibleCampaigns });
}
