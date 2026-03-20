import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; requestId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { campaignId, requestId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: "APPROVED" | "REJECTED" | "PENDING";
    reviewNote?: string;
  };
  const status = body.status;

  if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "A valid review status is required." }, { status: 400 });
  }

  const existing = await prisma.campaignRepeatRequest.findFirst({
    where: { id: requestId, campaignId },
    select: {
      id: true,
      userId: true,
      campaignId: true,
      campaign: { select: { title: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.campaignRepeatRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewNote: body.reviewNote?.trim() || null,
        reviewedAt: status === "PENDING" ? null : new Date(),
        reviewedByUserId: status === "PENDING" ? null : session.user.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: `ADMIN_${status}_CAMPAIGN_REPEAT_REQUEST`,
        entity: "CampaignRepeatRequest",
        details: `campaignId=${campaignId}, requestId=${requestId}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: existing.userId,
        title:
          status === "APPROVED"
            ? "Tomorrow request approved"
            : status === "REJECTED"
              ? "Tomorrow request not approved"
              : "Tomorrow request moved to pending",
        message:
          status === "APPROVED"
            ? `You can continue "${existing.campaign.title}" again under the current campaign rule.`
            : status === "REJECTED"
              ? `Your request for "${existing.campaign.title}" was reviewed but not approved.`
              : `Your request for "${existing.campaign.title}" is back under review.`,
        type: status === "REJECTED" ? "WARNING" : "INFO",
      },
    });

    return next;
  });

  return NextResponse.json({ message: `Request ${status.toLowerCase()}.`, request: updated });
}
