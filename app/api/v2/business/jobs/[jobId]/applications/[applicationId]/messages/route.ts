import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import {
  containsRestrictedContactDetails,
  getRestrictedContactReasons,
  isJobApplicationChatOpen,
  jobApplicationChatMessageSelect,
  normalizeJobApplicationChatMessage,
  serializeJobApplicationChatMessage,
  truncateJobChatPreview,
} from "@/lib/job-application-chat";
import { sendInAppNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

async function getBusinessApplication(sessionUserId: string, jobId: string, applicationId: string) {
  const context = await getBusinessContext(sessionUserId);
  if (!context) {
    return { error: NextResponse.json({ error: "Business context not found" }, { status: 404 }) };
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return {
      error: NextResponse.json(
        { error: "This business role cannot manage job applicant messages" },
        { status: 403 }
      ),
    };
  }

  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      jobId,
      job: { businessId: context.businessUserId },
    },
    select: {
      id: true,
      status: true,
      adminStatus: true,
      jobId: true,
      userId: true,
      job: {
        select: {
          title: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!application) {
    return { error: NextResponse.json({ error: "Application not found" }, { status: 404 }) };
  }

  return { context, application };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string; applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { jobId, applicationId } = await params;
  const resolved = await getBusinessApplication(session.user.id, jobId, applicationId);
  if ("error" in resolved) return resolved.error;

  const messages = await prisma.jobApplicationMessage.findMany({
    where: { applicationId: resolved.application.id },
    ...jobApplicationChatMessageSelect,
  });

  return NextResponse.json({
    canSend: isJobApplicationChatOpen(resolved.application.status, resolved.application.adminStatus),
    visibleToAdmin: true,
    messages: messages.map(serializeJobApplicationChatMessage),
    thread: {
      applicationId: resolved.application.id,
      status: resolved.application.status,
      candidateName: resolved.application.user.name || "Candidate",
      jobTitle: resolved.application.job.title,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string; applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { jobId, applicationId } = await params;
  const resolved = await getBusinessApplication(session.user.id, jobId, applicationId);
  if ("error" in resolved) return resolved.error;

  if (!isJobApplicationChatOpen(resolved.application.status, resolved.application.adminStatus)) {
    return NextResponse.json(
      { error: "Chat becomes available after admin approves the candidate for business review." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const message = normalizeJobApplicationChatMessage(body?.message);
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (containsRestrictedContactDetails(message)) {
    const reasons = getRestrictedContactReasons(message);
    await prisma.$transaction([
      prisma.jobApplicationChatFlag.create({
        data: {
          applicationId: resolved.application.id,
          senderUserId: session.user.id,
          senderRole: "BUSINESS",
          message,
          detectedReasons: reasons,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "JOB_APPLICATION_CHAT_FLAGGED_BY_BUSINESS",
          entity: "JobApplicationChatFlag",
          details: `applicationId=${resolved.application.id}, reasons=${reasons.join("|")}`,
        },
      }),
    ]);
    return NextResponse.json(
      { error: "Sharing phone numbers, email, UPI IDs, or external contact links is not allowed in chat." },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const next = await tx.jobApplicationMessage.create({
      data: {
        applicationId: resolved.application.id,
        senderUserId: session.user.id,
        senderRole: "BUSINESS",
        message,
      },
      select: jobApplicationChatMessageSelect.select,
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "JOB_APPLICATION_CHAT_SENT_BY_BUSINESS",
        entity: "JobApplicationMessage",
        details: `applicationId=${resolved.application.id}, jobId=${jobId}, recipientUserId=${resolved.application.userId}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: resolved.application.userId,
    title: "New message from the business",
    message: `The business sent a message about "${resolved.application.job.title}": ${truncateJobChatPreview(message)}`,
    type: "INFO",
    templateKey: "job.application_chat_business_message",
    payload: {
      applicationId: resolved.application.id,
      jobId,
      senderRole: "BUSINESS",
    },
  });

  return NextResponse.json({
    message: "Message sent",
    chatMessage: serializeJobApplicationChatMessage(created),
  });
}
