import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const assignments = await prisma.campaignAssignment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          rewardPerTask: true,
          remainingBudget: true,
          totalBudget: true,
        },
      },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      createdAt: a.createdAt.toISOString(),
      campaign: a.campaign,
      assignedBy: a.assignedBy,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as { campaignId?: unknown } | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId.trim() : "";

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, title: true, category: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.category.toLowerCase() !== "work") {
    return NextResponse.json({ error: "Only work-based campaigns can be assigned." }, { status: 400 });
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.campaignAssignment.upsert({
      where: { campaignId_userId: { campaignId, userId } },
      update: { assignedByUserId: session.user.id },
      create: { campaignId, userId, assignedByUserId: session.user.id },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_ASSIGN_USER_TO_CAMPAIGN",
        entity: "CampaignAssignment",
        details: `userId=${userId}, campaignId=${campaignId}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: userId,
        action: "ADMIN_ASSIGN_USER_TO_CAMPAIGN",
        details: `campaignId=${campaignId}, title=${campaign.title}`,
      },
    });

    return created;
  });

  return NextResponse.json({ message: "User assigned", assignment });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const url = new URL(req.url);
  const campaignId = (url.searchParams.get("campaignId") || "").trim();

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignAssignment.delete({
      where: { campaignId_userId: { campaignId, userId } },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_UNASSIGN_USER_FROM_CAMPAIGN",
        entity: "CampaignAssignment",
        details: `userId=${userId}, campaignId=${campaignId}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        targetUserId: userId,
        action: "ADMIN_UNASSIGN_USER_FROM_CAMPAIGN",
        details: `campaignId=${campaignId}`,
      },
    });
  });

  return NextResponse.json({ message: "Assignment removed" });
}

