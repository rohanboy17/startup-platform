import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const { action, reason } = (await req.json()) as { action?: "APPROVE" | "REJECT"; reason?: string };
  const reviewReason = reason?.trim() || "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }
  if (action === "REJECT" && !reviewReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          businessId: true,
        },
      },
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.managerStatus !== "PENDING") {
    return NextResponse.json({ error: "Manager already reviewed this application" }, { status: 400 });
  }
  if (application.status === "WITHDRAWN") {
    return NextResponse.json({ error: "Withdrawn applications cannot be reviewed" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.jobApplication.update({
      where: { id: applicationId },
      data: {
        managerStatus: action === "APPROVE" ? "MANAGER_APPROVED" : "MANAGER_REJECTED",
        managerReason: action === "REJECT" ? reviewReason : null,
        managerReviewedAt: new Date(),
        managerReviewedByUserId: session.user.id,
        ...(action === "REJECT"
          ? {
              status: "REJECTED",
            }
          : {}),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: action === "APPROVE" ? "MANAGER_APPROVED_JOB_APPLICATION" : "MANAGER_REJECTED_JOB_APPLICATION",
        entity: "JobApplication",
        details: `applicationId=${applicationId}, jobId=${application.jobId}${reviewReason ? `, reason=${reviewReason}` : ""}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: application.user.id,
    title: action === "APPROVE" ? "Job application passed manager review" : "Job application rejected by manager",
    message:
      action === "APPROVE"
        ? `Your application for "${application.job.title}" passed manager review and is pending final admin verification.`
        : `Your application for "${application.job.title}" was rejected at manager review stage.${reviewReason ? ` Reason: ${reviewReason}` : ""}`,
    type: action === "APPROVE" ? "INFO" : "WARNING",
    templateKey: action === "APPROVE" ? "job.application_manager_approved" : "job.application_manager_rejected",
    payload: {
      applicationId,
      jobId: application.job.id,
      action,
    },
  });

  return NextResponse.json({
    message: action === "APPROVE" ? "Application moved to admin review" : "Application rejected",
    application: updated,
  });
}
