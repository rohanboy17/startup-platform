import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import { sendInAppNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { normalizeInterviewText, normalizeMeetingUrl } from "@/lib/job-interviews";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string; applicationId: string; interviewId: string }> }
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
    return NextResponse.json({ error: "This business role cannot manage interview links" }, { status: 403 });
  }

  const { jobId, applicationId, interviewId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { meetingProvider?: unknown; meetingUrl?: unknown; locationNote?: unknown }
    | null;

  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      jobId,
      adminStatus: "ADMIN_APPROVED",
      job: { businessId: context.businessUserId },
    },
    select: {
      id: true,
      userId: true,
      job: {
        select: {
          title: true,
        },
      },
      interviews: {
        where: { id: interviewId },
        select: {
          id: true,
          mode: true,
          status: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const interview = application.interviews[0];
  if (!interview) {
    return NextResponse.json({ error: "Interview round not found" }, { status: 404 });
  }
  if (interview.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only scheduled interview rounds can be updated" }, { status: 400 });
  }

  const meetingProvider = normalizeInterviewText(body?.meetingProvider, 80);
  const meetingUrl = body?.meetingUrl === undefined ? null : normalizeMeetingUrl(body?.meetingUrl);
  const locationNote = normalizeInterviewText(body?.locationNote, 600);

  if (body?.meetingUrl && !meetingUrl) {
    return NextResponse.json({ error: "Meeting link must be a valid http or https URL" }, { status: 400 });
  }
  if (interview.mode === "VIRTUAL" && !meetingUrl) {
    return NextResponse.json({ error: "A meeting link is required for virtual interviews" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobApplicationInterview.update({
      where: { id: interviewId },
      data: {
        meetingProvider: meetingProvider || null,
        meetingUrl,
        locationNote: locationNote || null,
        meetingSharedAt: new Date(),
        meetingSharedByBusinessId: context.businessUserId,
        updatedByUserId: context.actorUserId,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_SHARED_INTERVIEW_DETAILS",
        entity: "JobApplicationInterview",
        details: `applicationId=${applicationId}, interviewId=${interviewId}, mode=${interview.mode}`,
      },
    });
  });

  await sendInAppNotification({
    userId: application.userId,
    title: "Interview details updated",
    message: `The business updated the meeting details for "${application.job.title}".`,
    type: "INFO",
    templateKey: "job.interview_business_details_updated",
    payload: {
      applicationId,
      interviewId,
      jobId,
    },
  });

  return NextResponse.json({ message: "Interview details updated" });
}
