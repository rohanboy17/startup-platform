import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

async function getUserApplication(sessionUserId: string, applicationId: string) {
  const application = await prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      userId: sessionUserId,
    },
    select: {
      id: true,
      status: true,
      adminStatus: true,
      jobId: true,
      job: {
        select: {
          title: true,
          businessId: true,
          business: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!application) {
    return { error: NextResponse.json({ error: "Application not found" }, { status: 404 }) };
  }

  return { application };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const resolved = await getUserApplication(session.user.id, applicationId);
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
      businessName: resolved.application.job.business.name || "Business",
      jobTitle: resolved.application.job.title,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const resolved = await getUserApplication(session.user.id, applicationId);
  if ("error" in resolved) return resolved.error;

  if (!isJobApplicationChatOpen(resolved.application.status, resolved.application.adminStatus)) {
    return NextResponse.json(
      { error: "Chat becomes available after admin approves your application for business review." },
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
          senderRole: "USER",
          message,
          detectedReasons: reasons,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "JOB_APPLICATION_CHAT_FLAGGED_BY_USER",
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
        senderRole: "USER",
        message,
      },
      select: jobApplicationChatMessageSelect.select,
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "JOB_APPLICATION_CHAT_SENT_BY_USER",
        entity: "JobApplicationMessage",
        details: `applicationId=${resolved.application.id}, jobId=${resolved.application.jobId}, recipientBusinessId=${resolved.application.job.businessId}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: resolved.application.job.businessId,
    title: "New message from an approved candidate",
    message: `An approved candidate sent a message about "${resolved.application.job.title}": ${truncateJobChatPreview(message)}`,
    type: "INFO",
    templateKey: "job.application_chat_user_message",
    payload: {
      applicationId: resolved.application.id,
      jobId: resolved.application.jobId,
      senderRole: "USER",
    },
  });

  return NextResponse.json({
    message: "Message sent",
    chatMessage: serializeJobApplicationChatMessage(created),
  });
}
