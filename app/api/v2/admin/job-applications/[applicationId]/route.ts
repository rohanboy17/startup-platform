import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const { action, reason, interviewAt } = (await req.json()) as {
    action?: "APPROVE" | "REJECT" | "SHORTLIST" | "SCHEDULE_INTERVIEW";
    reason?: string;
    interviewAt?: string | null;
  };
  const reviewReason = reason?.trim() || "";
  const interviewAtInput = typeof interviewAt === "string" ? interviewAt.trim() : "";
  const parsedInterviewAt = interviewAtInput ? new Date(interviewAtInput) : null;

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }
  if (action === "REJECT" && !reviewReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }
  if (
    action === "SCHEDULE_INTERVIEW" &&
    (!parsedInterviewAt || Number.isNaN(parsedInterviewAt.getTime()))
  ) {
    return NextResponse.json({ error: "A valid interview date and time is required" }, { status: 400 });
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
        select: { id: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.managerStatus !== "MANAGER_APPROVED") {
    return NextResponse.json({ error: "Manager approval is required before admin review" }, { status: 400 });
  }
  if (application.adminStatus !== "PENDING") {
    return NextResponse.json({ error: "Admin already reviewed this application" }, { status: 400 });
  }
  if (application.status === "WITHDRAWN") {
    return NextResponse.json({ error: "Withdrawn applications cannot be reviewed" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data =
      action === "APPROVE"
        ? {
            adminStatus: "ADMIN_APPROVED" as const,
            adminReason: null,
            adminReviewedAt: new Date(),
            adminReviewedByUserId: session.user.id,
          }
        : action === "REJECT"
          ? {
              adminStatus: "ADMIN_REJECTED" as const,
              adminReason: reviewReason,
              adminReviewedAt: new Date(),
              adminReviewedByUserId: session.user.id,
              status: "REJECTED" as const,
              interviewAt: null,
            }
          : action === "SHORTLIST"
            ? {
                status: "SHORTLISTED" as const,
                interviewAt: null,
              }
            : {
                status: "INTERVIEW_SCHEDULED" as const,
                interviewAt: parsedInterviewAt,
              };

    const next = await tx.jobApplication.update({
      where: { id: applicationId },
      data,
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action:
          action === "APPROVE"
            ? "ADMIN_APPROVED_JOB_APPLICATION"
            : action === "REJECT"
              ? "ADMIN_REJECTED_JOB_APPLICATION"
              : action === "SHORTLIST"
                ? "ADMIN_SHORTLISTED_JOB_APPLICATION"
                : "ADMIN_SCHEDULED_JOB_INTERVIEW",
        entity: "JobApplication",
        details: `applicationId=${applicationId}, jobId=${application.jobId}${reviewReason ? `, reason=${reviewReason}` : ""}${parsedInterviewAt ? `, interviewAt=${parsedInterviewAt.toISOString()}` : ""}`,
      },
    });

    return next;
  });

  const notifications = [];

  notifications.push(
    sendInAppNotification({
      userId: application.user.id,
      title:
        action === "APPROVE"
          ? "Job application cleared for business review"
          : action === "REJECT"
            ? "Job application rejected by admin"
            : action === "SHORTLIST"
              ? "Your job application was shortlisted"
              : "Your interview was scheduled",
      message:
        action === "APPROVE"
          ? `Your application for "${application.job.title}" passed final admin verification and is now visible to the business.`
          : action === "REJECT"
            ? `Your application for "${application.job.title}" did not pass final admin verification.${reviewReason ? ` Reason: ${reviewReason}` : ""}`
            : action === "SHORTLIST"
              ? `Your application for "${application.job.title}" was shortlisted during admin review.`
              : `Your interview for "${application.job.title}" is scheduled for ${parsedInterviewAt?.toLocaleString()}.`,
      type: action === "REJECT" ? "WARNING" : "SUCCESS",
      templateKey:
        action === "APPROVE"
          ? "job.application_admin_approved"
          : action === "REJECT"
            ? "job.application_admin_rejected"
            : action === "SHORTLIST"
              ? "job.application_shortlisted"
              : "job.application_interview_scheduled",
      payload: {
        applicationId,
        jobId: application.job.id,
        action,
        interviewAt: parsedInterviewAt?.toISOString() || null,
      },
    })
  );

  if (action === "APPROVE" || action === "REJECT") {
    notifications.push(
      sendInAppNotification({
        userId: application.job.businessId,
        title: action === "APPROVE" ? "Verified applicant ready" : "Applicant rejected in final review",
        message:
          action === "APPROVE"
            ? `A verified applicant is now ready for "${application.job.title}".`
            : `An applicant for "${application.job.title}" was rejected during final admin review.`,
        type: "INFO",
        templateKey: action === "APPROVE" ? "job.business_candidate_unlocked" : "job.business_candidate_rejected",
        payload: {
          applicationId,
          jobId: application.job.id,
          action,
        },
      })
    );
  }

  await Promise.all(notifications);

  return NextResponse.json({
    message:
      action === "APPROVE"
        ? "Application approved for business review"
        : action === "REJECT"
          ? "Application rejected"
          : action === "SHORTLIST"
            ? "Applicant shortlisted"
            : "Interview scheduled",
    application: updated,
  });
}
