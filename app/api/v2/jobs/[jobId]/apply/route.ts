import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";
import { parseProfileDetails } from "@/lib/user-profile";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { jobId } = await params;
  const body = (await req.json().catch(() => null)) as { coverNote?: unknown } | null;
  const coverNote =
    typeof body?.coverNote === "string" ? body.coverNote.trim().slice(0, 500) : null;

  const [user, job, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        accountStatus: true,
        deletedAt: true,
        profileDetails: true,
      },
    }),
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        businessId: true,
        city: true,
        state: true,
      },
    }),
    prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId: session.user.id,
        },
      },
      select: { id: true, status: true },
    }),
  ]);

  if (!user || user.accountStatus !== "ACTIVE" || user.deletedAt) {
    return NextResponse.json({ error: "User account is not eligible to apply." }, { status: 403 });
  }
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for applications." }, { status: 400 });
  }
  if (existing) {
    return NextResponse.json({ error: "You already applied to this job." }, { status: 409 });
  }

  const profile = parseProfileDetails(user.profileDetails);
  if (!profile.city || !profile.state) {
    return NextResponse.json(
      { error: "Please complete your city and state in profile before applying for local jobs." },
      { status: 400 }
    );
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.jobApplication.create({
      data: {
        jobId,
        userId: session.user.id,
        coverNote,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "JOB_APPLIED",
        entity: "JobApplication",
        details: `jobId=${jobId}, city=${job.city}, state=${job.state}`,
      },
    });

    return created;
  });

  await sendInAppNotification({
    userId: job.businessId,
    title: "New job application awaiting review",
    message: `A user applied for "${job.title}". The application is now waiting for manager and admin verification.`,
    type: "INFO",
    templateKey: "job.application_received",
    payload: {
      jobId,
      applicationId: application.id,
      applicantUserId: session.user.id,
    },
  });

  return NextResponse.json({ message: "Application submitted", application }, { status: 201 });
}
