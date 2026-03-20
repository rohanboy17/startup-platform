import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { CAMPAIGN_CATEGORY_OPTIONS } from "@/lib/campaign-options";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import { normalizeExternalUrl } from "@/lib/external-url";
import { normalizeTaskSelection } from "@/lib/task-categories";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot create campaigns" }, { status: 403 });
  }

  const businessAccount = await prisma.user.findUnique({
    where: { id: context.businessUserId },
    select: { kycStatus: true },
  });

  if (!businessAccount) {
    return NextResponse.json({ error: "Business account not found" }, { status: 404 });
  }

  if (businessAccount.kycStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Business KYC verification is required before creating campaigns." },
      { status: 403 }
    );
  }

  const {
    title,
    description,
    category,
    taskCategory,
    taskType,
    customTask,
    taskLink,
    rewardPerTask,
    totalBudget,
    instructions,
  } =
    (await req.json()) as {
      title?: string;
      description?: string;
      category?: string;
      taskCategory?: string;
      taskType?: string;
      customTask?: string | null;
      taskLink?: string;
      rewardPerTask?: number;
      totalBudget?: number;
      instructions?: string[];
    };

  const reward = Number(rewardPerTask);
  const budget = Number(totalBudget);
  const normalizedCategory = category?.trim().toLowerCase() || "";
  const allowedCategories = new Set<string>(CAMPAIGN_CATEGORY_OPTIONS.map((item) => item.value));

  if (!title || !description || !normalizedCategory || Number.isNaN(reward) || Number.isNaN(budget)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (reward <= 0 || budget <= 0) {
    return NextResponse.json({ error: "Invalid reward or budget" }, { status: 400 });
  }

  if (!allowedCategories.has(normalizedCategory)) {
    return NextResponse.json({ error: "Invalid category type" }, { status: 400 });
  }

  const normalizedTaskSelection = normalizeTaskSelection({
    taskCategory,
    taskType,
    customTask,
  });

  if ("error" in normalizedTaskSelection) {
    return NextResponse.json({ error: normalizedTaskSelection.error }, { status: 400 });
  }

  const wallet = await ensureBusinessWalletSynced(context.businessUserId);

  if (!wallet || wallet.balance < budget) {
    return NextResponse.json({ error: "Insufficient business wallet balance" }, { status: 400 });
  }

  const campaign = await prisma.$transaction(async (tx) => {
    await tx.businessWallet.update({
      where: { businessId: context.businessUserId },
      data: {
        balance: { decrement: budget },
        totalSpent: { increment: budget },
      },
    });

    await tx.user.update({
      where: { id: context.businessUserId },
      data: {
        balance: { decrement: budget },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: context.businessUserId,
        type: "DEBIT",
        amount: budget,
        note: `Campaign budget allocated: ${title}`,
      },
    });

    const created = await tx.campaign.create({
      data: {
        businessId: context.businessUserId,
        title,
        description,
        category: normalizedCategory,
        taskCategory: normalizedTaskSelection.taskCategory,
        taskType: normalizedTaskSelection.taskType,
        customTask: normalizedTaskSelection.customTask,
        taskLink: normalizeExternalUrl(taskLink),
        rewardPerTask: reward,
        totalBudget: budget,
        remainingBudget: budget,
        submissionMode: "MULTIPLE_PER_USER",
        status: "PENDING",
      },
    });

    if (instructions?.length) {
      await tx.campaignInstruction.createMany({
        data: instructions
          .filter((item) => item && item.trim())
          .map((instructionText, index) => ({
            campaignId: created.id,
            instructionText: instructionText.trim(),
            sequence: index + 1,
          })),
      });
    }

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "CAMPAIGN_CREATED",
        entity: "Campaign",
        details: `campaignId=${created.id}, budget=${budget}, businessId=${context.businessUserId}`,
      },
    });

    return created;
  });

  return NextResponse.json({ message: "Campaign created", campaign }, { status: 201 });
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

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: context.businessUserId },
    include: {
      submissions: {
        select: {
          id: true,
          adminStatus: true,
          managerStatus: true,
        },
      },
      instructions: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const campaignsWithMetrics = campaigns.map((campaign) => {
    const approvedCount = campaign.submissions.filter(
      (submission) => submission.adminStatus === "ADMIN_APPROVED"
    ).length;
    const rejectedCount = campaign.submissions.filter(
      (submission) => submission.adminStatus === "ADMIN_REJECTED"
    ).length;
    const pendingCount = campaign.submissions.filter(
      (submission) => submission.managerStatus !== "MANAGER_REJECTED" && submission.adminStatus === "PENDING"
    ).length;
    const totalSlots =
      campaign.rewardPerTask > 0 ? Math.floor(campaign.totalBudget / campaign.rewardPerTask) : 0;
    const usedSlots = campaign.submissions.length;
    const slotsLeft = Math.max(0, totalSlots - usedSlots);

    return {
      ...campaign,
      _count: {
        submissions: campaign.submissions.length,
      },
      metrics: {
        approvedCount,
        rejectedCount,
        pendingCount,
        totalSlots,
        usedSlots,
        slotsLeft,
      },
    };
  });

  return NextResponse.json({ accessRole: context.accessRole, campaigns: campaignsWithMetrics });
}
