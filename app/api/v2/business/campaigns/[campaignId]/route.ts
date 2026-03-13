import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { CAMPAIGN_CATEGORY_OPTIONS } from "@/lib/campaign-options";
import {
  canManageBusinessCampaigns,
  getBusinessContext,
} from "@/lib/business-context";

type CampaignAction = "PAUSE" | "RESUME" | "CLOSE";

function isValidCategory(category: string) {
  return CAMPAIGN_CATEGORY_OPTIONS.some((item) => item.value === category);
}

function parseInstructionLines(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot manage campaigns" }, { status: 403 });
  }

  const { campaignId } = await params;
  const { action } = (await req.json()) as {
    action?: CampaignAction;
  };

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      businessId: context.businessUserId,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const nextStatus =
    action === "PAUSE" ? "APPROVED" : action === "RESUME" ? "LIVE" : "COMPLETED";

  if (action === "PAUSE" && campaign.status !== "LIVE") {
    return NextResponse.json({ error: "Only live campaigns can be paused" }, { status: 400 });
  }

  if (action === "RESUME" && !["APPROVED", "PENDING"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "Only approved or pending-ready campaigns can be resumed" },
      { status: 400 }
    );
  }

  if (action === "RESUME" && campaign.status === "PENDING") {
    return NextResponse.json(
      { error: "Campaign is still pending admin approval" },
      { status: 400 }
    );
  }

  if (action === "CLOSE" && campaign.status === "COMPLETED") {
    return NextResponse.json({ error: "Campaign is already completed" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.campaign.update({
      where: { id: campaignId },
      data: { status: nextStatus },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: `BUSINESS_${action}_CAMPAIGN`,
        entity: "Campaign",
        details: `campaignId=${campaignId}, from=${campaign.status}, to=${nextStatus}, businessId=${context.businessUserId}`,
      },
    });

    return next;
  });

  return NextResponse.json({
    message:
      action === "PAUSE"
        ? "Campaign paused"
        : action === "RESUME"
          ? "Campaign resumed"
          : "Campaign closed",
    campaign: updated,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot manage campaigns" }, { status: 403 });
  }

  const { campaignId } = await params;
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    category?: string;
    taskLink?: string | null;
    rewardPerTask?: number;
    totalBudget?: number;
    instructions?: string[];
  };

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      businessId: context.businessUserId,
    },
    include: {
      instructions: {
        orderBy: { sequence: "asc" },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const title = body.title?.trim() || campaign.title;
  const description = body.description?.trim() || campaign.description;
  const category = body.category?.trim().toLowerCase() || campaign.category;
  const taskLink = body.taskLink === undefined ? campaign.taskLink : body.taskLink?.trim() || null;
  const rewardPerTask = Number(body.rewardPerTask ?? campaign.rewardPerTask);
  const totalBudget = Number(body.totalBudget ?? campaign.totalBudget);
  const instructions = parseInstructionLines(body.instructions);

  if (!title || !description || !category) {
    return NextResponse.json({ error: "Title, description, and category are required" }, { status: 400 });
  }

  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category type" }, { status: 400 });
  }

  if (Number.isNaN(rewardPerTask) || rewardPerTask <= 0) {
    return NextResponse.json({ error: "Invalid reward per task" }, { status: 400 });
  }

  if (Number.isNaN(totalBudget) || totalBudget <= 0) {
    return NextResponse.json({ error: "Invalid total budget" }, { status: 400 });
  }

  const spent = campaign.totalBudget - campaign.remainingBudget;
  if (totalBudget < spent) {
    return NextResponse.json(
      { error: `Total budget cannot be less than already used budget (INR ${spent.toFixed(2)})` },
      { status: 400 }
    );
  }

  const totalSlots = Math.floor(totalBudget / rewardPerTask);
  if (totalSlots < 1) {
    return NextResponse.json(
      { error: "Budget must be enough to fund at least one slot at the selected reward" },
      { status: 400 }
    );
  }

  if (totalSlots < campaign._count.submissions) {
    return NextResponse.json(
      {
        error:
          "This reward and budget combination would create fewer slots than the campaign already used.",
      },
      { status: 400 }
    );
  }

  const budgetDelta = totalBudget - campaign.totalBudget;
  if (budgetDelta > 0) {
    const wallet = await ensureBusinessWalletSynced(context.businessUserId);
    if (wallet.balance < budgetDelta) {
      return NextResponse.json({ error: "Insufficient business wallet balance for this increase" }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (budgetDelta > 0) {
      await tx.businessWallet.update({
        where: { businessId: context.businessUserId },
        data: {
          balance: { decrement: budgetDelta },
          totalSpent: { increment: budgetDelta },
        },
      });

      await tx.user.update({
        where: { id: context.businessUserId },
        data: {
          balance: { decrement: budgetDelta },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: context.businessUserId,
          type: "DEBIT",
          amount: budgetDelta,
          note: `Campaign budget top-up: ${title}`,
        },
      });
    }

    if (budgetDelta < 0) {
      const released = Math.abs(budgetDelta);

      await tx.businessWallet.update({
        where: { businessId: context.businessUserId },
        data: {
          balance: { increment: released },
          totalSpent: { decrement: released },
        },
      });

      await tx.user.update({
        where: { id: context.businessUserId },
        data: {
          balance: { increment: released },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: context.businessUserId,
          type: "CREDIT",
          amount: released,
          note: `Campaign budget released: ${title}`,
        },
      });
    }

    const nextCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        title,
        description,
        category,
        taskLink,
        rewardPerTask,
        totalBudget,
        remainingBudget: totalBudget - spent,
      },
    });

    await tx.campaignInstruction.deleteMany({
      where: { campaignId },
    });

    if (instructions.length > 0) {
      await tx.campaignInstruction.createMany({
        data: instructions.map((instructionText, index) => ({
          campaignId,
          instructionText,
          sequence: index + 1,
        })),
      });
    }

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_EDIT_CAMPAIGN",
        entity: "Campaign",
        details: `campaignId=${campaignId}, budgetDelta=${budgetDelta.toFixed(2)}, businessId=${context.businessUserId}`,
      },
    });

    return nextCampaign;
  });

  return NextResponse.json({ message: "Campaign updated", campaign: updated });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot manage campaigns" }, { status: 403 });
  }

  const { campaignId } = await params;
  const sourceCampaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      businessId: context.businessUserId,
    },
    include: {
      instructions: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!sourceCampaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const wallet = await ensureBusinessWalletSynced(context.businessUserId);
  if (wallet.balance < sourceCampaign.totalBudget) {
    return NextResponse.json({ error: "Insufficient business wallet balance to duplicate this campaign" }, { status: 400 });
  }

  const duplicated = await prisma.$transaction(async (tx) => {
    await tx.businessWallet.update({
      where: { businessId: context.businessUserId },
      data: {
        balance: { decrement: sourceCampaign.totalBudget },
        totalSpent: { increment: sourceCampaign.totalBudget },
      },
    });

    await tx.user.update({
      where: { id: context.businessUserId },
      data: {
        balance: { decrement: sourceCampaign.totalBudget },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: context.businessUserId,
        type: "DEBIT",
        amount: sourceCampaign.totalBudget,
        note: `Campaign duplicated: ${sourceCampaign.title}`,
      },
    });

    const nextCampaign = await tx.campaign.create({
      data: {
        businessId: context.businessUserId,
        title: `${sourceCampaign.title} (Copy)`,
        description: sourceCampaign.description,
        category: sourceCampaign.category,
        taskLink: sourceCampaign.taskLink,
        rewardPerTask: sourceCampaign.rewardPerTask,
        totalBudget: sourceCampaign.totalBudget,
        remainingBudget: sourceCampaign.totalBudget,
        submissionMode: sourceCampaign.submissionMode,
        status: "PENDING",
      },
    });

    if (sourceCampaign.instructions.length > 0) {
      await tx.campaignInstruction.createMany({
        data: sourceCampaign.instructions.map((instruction, index) => ({
          campaignId: nextCampaign.id,
          instructionText: instruction.instructionText,
          sequence: index + 1,
        })),
      });
    }

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_DUPLICATE_CAMPAIGN",
        entity: "Campaign",
        details: `sourceCampaignId=${campaignId}, newCampaignId=${nextCampaign.id}, businessId=${context.businessUserId}`,
      },
    });

    return nextCampaign;
  });

  return NextResponse.json(
    {
      message: "Campaign duplicated",
      campaign: duplicated,
    },
    { status: 201 }
  );
}
