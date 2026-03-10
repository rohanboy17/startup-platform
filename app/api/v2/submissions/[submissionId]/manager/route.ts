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
  const { action, reason } = (await req.json()) as { action?: "APPROVE" | "REJECT"; reason?: string };
  const reviewReason = reason?.trim() || "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  if (action === "REJECT" && !reviewReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, userId: true, managerStatus: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.managerStatus !== "PENDING") {
    return NextResponse.json({ error: "Manager already reviewed this submission" }, { status: 400 });
  }

  const managerStatus =
    action === "APPROVE" ? ("MANAGER_APPROVED" as const) : ("MANAGER_REJECTED" as const);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSubmission = await tx.submission.update({
      where: { id: submissionId },
      data: { managerStatus },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: action === "APPROVE" ? "MANAGER_APPROVED_SUBMISSION" : "MANAGER_REJECTED_SUBMISSION",
        entity: "Submission",
        details: `submissionId=${submissionId}${reviewReason ? `, reason=${reviewReason}` : ""}`,
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: submission.userId,
        title: action === "APPROVE" ? "Submission approved by manager" : "Submission rejected by manager",
        message:
          action === "APPROVE"
            ? "Your submission passed manager review and is pending admin verification."
            : `Your submission was rejected at manager review stage.${reviewReason ? ` Reason: ${reviewReason}` : ""}`,
        type: action === "APPROVE" ? "INFO" : "WARNING",
      },
    });
    await tx.notificationDeliveryLog.create({
      data: {
        userId: submission.userId,
        notificationId: notification.id,
        templateKey: action === "APPROVE" ? "submission.manager_approved" : "submission.manager_rejected",
        channel: "IN_APP",
        status: "SENT",
        payload: { submissionId, action },
      },
    });

    return updatedSubmission;
  });

  return NextResponse.json({ message: "Manager review saved", submission: updated });
}
