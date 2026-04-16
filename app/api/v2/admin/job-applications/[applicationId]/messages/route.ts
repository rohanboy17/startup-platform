import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isJobApplicationChatOpen,
  jobApplicationChatMessageSelect,
  serializeJobApplicationChatMessage,
} from "@/lib/job-application-chat";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { applicationId } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      adminStatus: true,
      job: {
        select: {
          title: true,
          business: {
            select: {
              name: true,
            },
          },
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
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const messages = await prisma.jobApplicationMessage.findMany({
    where: { applicationId },
    ...jobApplicationChatMessageSelect,
  });

  return NextResponse.json({
    canSend: false,
    visibleToAdmin: true,
    messages: messages.map(serializeJobApplicationChatMessage),
    thread: {
      applicationId: application.id,
      status: application.status,
      isLive: isJobApplicationChatOpen(application.status, application.adminStatus),
      candidateName: application.user.name || "Candidate",
      businessName: application.job.business.name || "Business",
      jobTitle: application.job.title,
    },
  });
}
