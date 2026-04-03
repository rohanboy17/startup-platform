import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      userId: session.user.id,
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          businessId: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (!["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(application.status)) {
    return NextResponse.json({ error: "This application can no longer be withdrawn." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: "WITHDRAWN",
        reviewedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "JOB_APPLICATION_WITHDRAWN",
        entity: "JobApplication",
        details: `jobId=${application.job.id}, applicationId=${applicationId}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: application.job.businessId,
    title: "Job application withdrawn",
    message: `A user withdrew their application for "${application.job.title}".`,
    type: "INFO",
    templateKey: "job.application_withdrawn",
    payload: {
      jobId: application.job.id,
      applicationId,
      applicantUserId: session.user.id,
    },
  });

  return NextResponse.json({ message: "Application withdrawn", application: updated });
}
