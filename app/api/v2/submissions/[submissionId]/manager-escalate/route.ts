import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { submissionId } = await params;
  const { reason } = (await req.json()) as { reason?: string };
  const reasonText = reason?.trim() || "Escalated by manager for extra review";

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      ipAddress: true,
      campaignId: true,
      managerStatus: true,
      managerEscalatedAt: true,
      campaign: { select: { title: true } },
      user: { select: { isSuspicious: true } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.managerStatus !== "PENDING") {
    return NextResponse.json({ error: "Manager already reviewed this submission" }, { status: 400 });
  }

  if (submission.managerEscalatedAt) {
    return NextResponse.json({ error: "Submission already escalated" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        managerEscalatedAt: new Date(),
        managerEscalationReason: reasonText,
        managerEscalatedByUserId: session.user.id,
      },
    });

    if (!submission.user.isSuspicious) {
      await tx.user.update({
        where: { id: submission.userId },
        data: {
          isSuspicious: true,
          suspiciousReason: `Manager escalation: ${reasonText}`,
          flaggedAt: new Date(),
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "MANAGER_ESCALATED_SUBMISSION",
        entity: "Submission",
        details: `submissionId=${submissionId}${submission.campaignId ? `, campaignId=${submission.campaignId}` : ""}, userId=${submission.userId}, reason=${reasonText}`,
      },
    });

    await tx.securityEvent.create({
      data: {
        kind: "MANAGER_ESCALATION_SUBMISSION",
        severity: "MEDIUM",
        status: "OPEN",
        ipAddress: submission.ipAddress,
        userId: submission.userId,
        message: `Manager escalated submission for review${submission.campaign?.title ? ` (${submission.campaign.title})` : ""}.`,
        metadata: {
          submissionId,
          campaignId: submission.campaignId,
          reason: reasonText,
          escalatedByUserId: session.user.id,
        },
      },
    });
  });

  return NextResponse.json({ message: "Escalated to Risk Center" });
}

