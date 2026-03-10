import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const trendStart = new Date();
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - 13);

  const [campaigns, submissions] = await Promise.all([
    prisma.campaign.findMany({
      where: { businessId: context.businessUserId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        totalBudget: true,
        remainingBudget: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.findMany({
      where: {
        campaign: { businessId: context.businessUserId },
      },
      select: {
        id: true,
        createdAt: true,
        adminStatus: true,
        campaignId: true,
        campaign: {
          select: {
            title: true,
            category: true,
            rewardPerTask: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalCampaigns = campaigns.length;
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === "LIVE").length;
  const pendingCampaigns = campaigns.filter((campaign) => campaign.status === "PENDING").length;
  const approvedSubmissions = submissions.filter(
    (submission) => submission.adminStatus === "ADMIN_APPROVED"
  ).length;
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.totalBudget, 0);
  const remainingBudget = campaigns.reduce((sum, campaign) => sum + campaign.remainingBudget, 0);
  const spentBudget = totalBudget - remainingBudget;
  const rejectedSubmissions = submissions.filter(
    (submission) => submission.adminStatus === "ADMIN_REJECTED"
  ).length;
  const totalSubmissions = submissions.length;
  const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
  const averageCostPerApproval = approvedSubmissions > 0 ? spentBudget / approvedSubmissions : 0;

  const trendDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    return date;
  });

  const trendMap = new Map(
    trendDates.map((date) => [
      dayKey(date),
      {
        label: dayLabel(date),
        submissions: 0,
        approved: 0,
        rejected: 0,
        spend: 0,
      },
    ])
  );

  const categoryMap = new Map<
    string,
    { category: string; campaigns: number; approved: number; rejected: number; spend: number }
  >();

  const campaignMap = new Map<
    string,
    {
      id: string;
      title: string;
      category: string;
      status: string;
      totalBudget: number;
      remainingBudget: number;
      submissions: number;
      approved: number;
      rejected: number;
      pending: number;
      spent: number;
      approvalRate: number;
      costPerApproved: number;
    }
  >();

  for (const campaign of campaigns) {
    campaignMap.set(campaign.id, {
      id: campaign.id,
      title: campaign.title,
      category: campaign.category,
      status: campaign.status,
      totalBudget: campaign.totalBudget,
      remainingBudget: campaign.remainingBudget,
      submissions: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      spent: campaign.totalBudget - campaign.remainingBudget,
      approvalRate: 0,
      costPerApproved: 0,
    });

    const categoryRow = categoryMap.get(campaign.category) || {
      category: campaign.category,
      campaigns: 0,
      approved: 0,
      rejected: 0,
      spend: 0,
    };
    categoryRow.campaigns += 1;
    categoryRow.spend += campaign.totalBudget - campaign.remainingBudget;
    categoryMap.set(campaign.category, categoryRow);
  }

  for (const submission of submissions) {
    const campaign = campaignMap.get(submission.campaignId || "");
    if (campaign) {
      campaign.submissions += 1;
      if (submission.adminStatus === "ADMIN_APPROVED") campaign.approved += 1;
      else if (submission.adminStatus === "ADMIN_REJECTED") campaign.rejected += 1;
      else campaign.pending += 1;
    }

    const categoryKey = submission.campaign?.category || "unknown";
    const categoryRow = categoryMap.get(categoryKey) || {
      category: categoryKey,
      campaigns: 0,
      approved: 0,
      rejected: 0,
      spend: 0,
    };
    if (submission.adminStatus === "ADMIN_APPROVED") {
      categoryRow.approved += 1;
    } else if (submission.adminStatus === "ADMIN_REJECTED") {
      categoryRow.rejected += 1;
    }
    categoryMap.set(categoryKey, categoryRow);

    const key = dayKey(submission.createdAt);
    const bucket = trendMap.get(key);
    if (bucket) {
      bucket.submissions += 1;
      if (submission.adminStatus === "ADMIN_APPROVED") {
        bucket.approved += 1;
        bucket.spend += submission.campaign?.rewardPerTask || 0;
      } else if (submission.adminStatus === "ADMIN_REJECTED") {
        bucket.rejected += 1;
      }
    }
  }

  const campaignRows = Array.from(campaignMap.values()).map((campaign) => ({
    ...campaign,
    approvalRate: campaign.submissions > 0 ? (campaign.approved / campaign.submissions) * 100 : 0,
    costPerApproved: campaign.approved > 0 ? campaign.spent / campaign.approved : 0,
  }));

  const topCampaigns = [...campaignRows]
    .sort((a, b) => {
      if (b.approved !== a.approved) return b.approved - a.approved;
      return b.spent - a.spent;
    })
    .slice(0, 5);

  const categoryPerformance = Array.from(categoryMap.values())
    .map((row) => ({
      ...row,
      approvalRate:
        row.approved + row.rejected > 0 ? (row.approved / (row.approved + row.rejected)) * 100 : 0,
    }))
    .sort((a, b) => b.approved - a.approved);

  return NextResponse.json({
    totalCampaigns,
    liveCampaigns,
    pendingCampaigns,
    approvedSubmissions,
    rejectedSubmissions,
    totalSubmissions,
    approvalRate,
    totalBudget,
    remainingBudget,
    spentBudget,
    averageCostPerApproval,
    trend: trendDates.map((date) => ({
      day: trendMap.get(dayKey(date))?.label || dayLabel(date),
      submissions: trendMap.get(dayKey(date))?.submissions || 0,
      approved: trendMap.get(dayKey(date))?.approved || 0,
      rejected: trendMap.get(dayKey(date))?.rejected || 0,
      spend: Number((trendMap.get(dayKey(date))?.spend || 0).toFixed(2)),
    })),
    categoryPerformance: categoryPerformance.map((row) => ({
      ...row,
      approvalRate: Number(row.approvalRate.toFixed(2)),
      spend: Number(row.spend.toFixed(2)),
    })),
    topCampaigns: topCampaigns.map((campaign) => ({
      ...campaign,
      approvalRate: Number(campaign.approvalRate.toFixed(2)),
      costPerApproved: Number(campaign.costPerApproved.toFixed(2)),
      spent: Number(campaign.spent.toFixed(2)),
    })),
  });
}
