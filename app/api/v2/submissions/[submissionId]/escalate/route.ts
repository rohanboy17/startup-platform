import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { submissionId } = await params;
  const { reason } = (await req.json()) as { reason?: string };
  const reasonText = reason?.trim() || "Escalated from admin review queue";

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      user: { select: { id: true, role: true, isSuspicious: true, email: true } },
      campaign: { select: { title: true } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.user.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot escalate admin account" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (!submission.user.isSuspicious) {
      await tx.user.update({
        where: { id: submission.user.id },
        data: {
          isSuspicious: true,
          suspiciousReason: `Submission escalation: ${reasonText}`,
          flaggedAt: new Date(),
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_ESCALATED_SUBMISSION_TO_RISK",
        entity: "Submission",
        details: `submissionId=${submissionId}, userId=${submission.user.id}, reason=${reasonText}`,
      },
    });
  });

  return NextResponse.json({
    message: `Escalated to Risk Center (${submission.user.email})`,
  });
}

