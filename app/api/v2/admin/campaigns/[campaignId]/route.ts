import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTutorialVideoUrl } from "@/lib/tutorial-video";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const { action, reason } = (await req.json()) as {
    action?:
      | "APPROVE"
      | "REJECT"
      | "LIVE"
      | "PAUSE"
      | "RESUME"
      | "COMPLETE"
      | "ESCALATE"
      | "CLEAR_ESCALATION";
    reason?: string;
  };

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      businessId: true,
      title: true,
      escalatedAt: true,
      escalationReason: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (action === "ESCALATE") {
    if (campaign.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending campaigns can be escalated" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          escalatedAt: new Date(),
          escalationReason: reason?.trim() || "Escalated by admin",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_ESCALATE_CAMPAIGN",
          entity: "Campaign",
          details: `campaignId=${campaignId}, reason=${reason?.trim() || "-"}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: campaign.businessId,
          title: "Campaign escalated for priority review",
          message: `Your campaign "${campaign.title}" has been escalated for faster moderation.`,
          type: "WARNING",
        },
      });

      return updatedCampaign;
    });

    return NextResponse.json({ message: "Campaign escalated", campaign: updated });
  }

  if (action === "CLEAR_ESCALATION") {
    if (!campaign.escalatedAt) {
      return NextResponse.json({ message: "Escalation already clear" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          escalatedAt: null,
          escalationReason: null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_CLEAR_ESCALATION_CAMPAIGN",
          entity: "Campaign",
          details: `campaignId=${campaignId}`,
        },
      });

      return updatedCampaign;
    });

    return NextResponse.json({ message: "Escalation cleared", campaign: updated });
  }

  const nextStatusByAction = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    LIVE: "LIVE",
    PAUSE: "APPROVED",
    RESUME: "LIVE",
    COMPLETE: "COMPLETED",
  } as const;

  const status = nextStatusByAction[action as keyof typeof nextStatusByAction];
  if (!status) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        escalatedAt: null,
        escalationReason: null,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: `ADMIN_${action}_CAMPAIGN`,
        entity: "Campaign",
        details: `campaignId=${campaignId}, from=${campaign.status}, to=${status}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: campaign.businessId,
        title: `Campaign ${status.toLowerCase()}`,
        message: `Your campaign "${campaign.title}" is now ${status}.`,
        type: action === "REJECT" ? "WARNING" : "INFO",
      },
    });

    return updatedCampaign;
  });

  return NextResponse.json({ message: `Campaign ${status.toLowerCase()}`, campaign: updated });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    category?: string;
    taskLink?: string | null;
    tutorialVideoUrl?: string | null;
    rewardPerTask?: number;
    totalBudget?: number;
    submissionMode?: "ONE_PER_USER" | "MULTIPLE_PER_USER";
  };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      taskLink: true,
      tutorialVideoUrl: true,
      rewardPerTask: true,
      totalBudget: true,
      remainingBudget: true,
      submissionMode: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const title = body.title?.trim() || campaign.title;
  const description = body.description?.trim() || campaign.description;
  const category = body.category?.trim() || campaign.category;
  const taskLink = body.taskLink === undefined ? campaign.taskLink : body.taskLink?.trim() || null;
  const tutorialVideoUrl =
    body.tutorialVideoUrl === undefined
      ? campaign.tutorialVideoUrl
      : normalizeTutorialVideoUrl(body.tutorialVideoUrl);
  const rewardPerTask = Number(body.rewardPerTask ?? campaign.rewardPerTask);
  const totalBudget = Number(body.totalBudget ?? campaign.totalBudget);
  const submissionMode = body.submissionMode ?? campaign.submissionMode;

  if (!title || !description || !category) {
    return NextResponse.json({ error: "Title, description and category are required" }, { status: 400 });
  }
  if (Number.isNaN(rewardPerTask) || rewardPerTask <= 0) {
    return NextResponse.json({ error: "Invalid reward per task" }, { status: 400 });
  }
  if (Number.isNaN(totalBudget) || totalBudget <= 0) {
    return NextResponse.json({ error: "Invalid total budget" }, { status: 400 });
  }
  if (!["ONE_PER_USER", "MULTIPLE_PER_USER"].includes(submissionMode)) {
    return NextResponse.json({ error: "Invalid submission mode" }, { status: 400 });
  }
  if (body.tutorialVideoUrl !== undefined && body.tutorialVideoUrl?.trim() && !tutorialVideoUrl) {
    return NextResponse.json(
      { error: "Tutorial video must be a valid YouTube, Loom, or direct video URL" },
      { status: 400 }
    );
  }

  const spent = campaign.totalBudget - campaign.remainingBudget;
  if (totalBudget < spent) {
    return NextResponse.json(
      { error: `Total budget cannot be less than already spent amount (${spent})` },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        title,
        description,
        category,
        taskLink,
        tutorialVideoUrl,
        rewardPerTask,
        totalBudget,
        remainingBudget: totalBudget - spent,
        submissionMode,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_EDIT_CAMPAIGN",
        entity: "Campaign",
        details: `campaignId=${campaignId}`,
      },
    });

    return updatedCampaign;
  });

  return NextResponse.json({ message: "Campaign updated", campaign: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { _count: { select: { submissions: true } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign._count.submissions > 0) {
    return NextResponse.json(
      { error: "Cannot delete campaign with submissions. Use status controls instead." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaign.delete({ where: { id: campaignId } });
    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_DELETE_CAMPAIGN",
        entity: "Campaign",
        details: `campaignId=${campaignId}`,
      },
    });
  });

  return NextResponse.json({ message: "Campaign deleted" });
}
