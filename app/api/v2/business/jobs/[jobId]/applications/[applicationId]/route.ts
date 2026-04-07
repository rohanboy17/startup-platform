import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import { sendInAppNotification } from "@/lib/notify";

const ALLOWED_STATUSES = new Set(["REJECTED", "HIRED"]);

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ jobId: string; applicationId: string }>;
  }
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
    return NextResponse.json({ error: "This business role cannot review job applications" }, { status: 403 });
  }

  const { jobId, applicationId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { status?: unknown; businessNote?: unknown }
    | null;
  const status = typeof body?.status === "string" ? body.status.trim() : "";
  const businessNote =
    typeof body?.businessNote === "string" ? body.businessNote.trim().slice(0, 500) : null;

  if (!status && body?.businessNote === undefined) {
    return NextResponse.json({ error: "Status or business note is required" }, { status: 400 });
  }
  if (status && !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid application status" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      jobId,
      job: { businessId: context.businessUserId },
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          openings: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.adminStatus !== "ADMIN_APPROVED") {
    return NextResponse.json(
      { error: "This applicant is still waiting for manager and admin verification." },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.jobApplication.update({
      where: { id: application.id },
      data: {
        ...(status
          ? {
              status: status as "REJECTED" | "HIRED",
            }
          : {}),
        ...(body?.businessNote !== undefined ? { businessNote } : {}),
        reviewedAt: status || body?.businessNote !== undefined ? new Date() : application.reviewedAt,
        reviewedByUserId: status || body?.businessNote !== undefined ? context.actorUserId : application.reviewedByUserId,
      },
    });

    if (status === "HIRED") {
      const hiredCount = await tx.jobApplication.count({
        where: {
          jobId,
          status: { in: ["HIRED", "JOINED"] },
        },
      });

      if (hiredCount >= application.job.openings) {
        await tx.jobPosting.update({
          where: { id: jobId },
          data: { status: "FILLED" },
        });
      }
    }

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: status ? `JOB_APPLICATION_${status}` : "JOB_APPLICATION_NOTE_UPDATED",
        entity: "JobApplication",
        details: `jobId=${jobId}, applicationId=${applicationId}, userId=${application.user.id}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: application.user.id,
    title:
      status === "HIRED"
        ? "You were selected for a job"
        : status === "REJECTED"
          ? "Your job application was updated"
          : "Business added an update to your application",
    message:
      status === "HIRED"
        ? `You were marked as hired for "${application.job.title}".`
        : status === "REJECTED"
          ? `Your application for "${application.job.title}" was not shortlisted this time.`
          : `The business added a note to your application for "${application.job.title}".`,
    type: status === "REJECTED" ? "WARNING" : "SUCCESS",
    templateKey: status ? "job.application_update" : "job.application_note",
    payload: {
      jobId,
      applicationId,
      status,
      businessNote,
    },
  });

  return NextResponse.json({
    message:
      !status
        ? "Application note updated"
        : status === "HIRED"
          ? "Applicant marked as hired"
          : "Applicant rejected",
    application: updated,
  });
}
