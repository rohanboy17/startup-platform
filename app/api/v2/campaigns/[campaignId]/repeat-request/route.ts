import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIndiaDateKey } from "@/lib/campaign-repeat";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const requestDateKey = getIndiaDateKey();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      title: true,
      submissionMode: true,
    },
  });

  if (!campaign || campaign.status !== "LIVE") {
    return NextResponse.json({ error: "Only running campaigns can accept tomorrow requests." }, { status: 400 });
  }

  if (campaign.submissionMode !== "MULTIPLE_PER_USER") {
    return NextResponse.json({ error: "This request option is available only on many-submission campaigns." }, { status: 400 });
  }

  const submissionCount = await prisma.submission.count({
    where: {
      campaignId,
      userId: session.user.id,
    },
  });

  if (submissionCount < 1) {
    return NextResponse.json({ error: "Complete at least one submission before requesting tomorrow access." }, { status: 400 });
  }

  const existing = await prisma.campaignRepeatRequest.findUnique({
    where: {
      campaignId_userId_requestDateKey: {
        campaignId,
        userId: session.user.id,
        requestDateKey,
      },
    },
    select: { id: true, status: true },
  });

  if (existing?.status === "PENDING") {
    return NextResponse.json({ error: "Your tomorrow request is already under review." }, { status: 409 });
  }

  const note = body.note?.trim() || null;

  const item = existing
    ? await prisma.campaignRepeatRequest.update({
        where: {
          campaignId_userId_requestDateKey: {
            campaignId,
            userId: session.user.id,
            requestDateKey,
          },
        },
        data: {
          status: "PENDING",
          reviewNote: note,
          reviewedAt: null,
          reviewedByUserId: null,
        },
      })
    : await prisma.campaignRepeatRequest.create({
        data: {
          campaignId,
          userId: session.user.id,
          requestDateKey,
          reviewNote: note,
        },
      });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", accountStatus: "ACTIVE", deletedAt: null },
    select: { id: true },
    take: 100,
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Tomorrow repeat request",
        message: `${session.user.name?.trim() || session.user.email || "A user"} requested tomorrow access for "${campaign.title}".`,
        type: "INFO",
      })),
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "CAMPAIGN_REPEAT_REQUEST_CREATED",
      entity: "CampaignRepeatRequest",
      details: `campaignId=${campaignId}, requestId=${item.id}, dateKey=${requestDateKey}`,
    },
  });

  return NextResponse.json({
    message: "Your tomorrow request is under review.",
    item: {
      id: item.id,
      status: item.status,
      requestDateKey: item.requestDateKey,
    },
  });
}
