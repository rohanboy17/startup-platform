import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendInAppNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  JOB_INTERVIEW_REMINDER_LEAD_MINUTES,
  nextInterviewAtFromRounds,
  normalizeInterviewText,
} from "@/lib/job-interviews";

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const next = new Date(value.trim());
  return Number.isNaN(next.getTime()) ? null : next;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "ALL").toUpperCase();
  const q = (searchParams.get("q") || "").trim();

  const interviews = await prisma.jobApplicationInterview.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { adminNote: { contains: q, mode: "insensitive" } },
              { interviewerNotes: { contains: q, mode: "insensitive" } },
              { application: { job: { title: { contains: q, mode: "insensitive" } } } },
              { application: { user: { name: { contains: q, mode: "insensitive" } } } },
              { application: { user: { email: { contains: q, mode: "insensitive" } } } },
              { application: { job: { business: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ scheduledAt: "asc" }, { roundNumber: "asc" }],
    select: {
      id: true,
      applicationId: true,
      roundNumber: true,
      title: true,
      status: true,
      mode: true,
      scheduledAt: true,
      durationMinutes: true,
      timezone: true,
      locationNote: true,
      meetingProvider: true,
      meetingUrl: true,
      adminNote: true,
      interviewerNotes: true,
      scorecard: true,
      rescheduledAt: true,
      rescheduleReason: true,
      cancelledAt: true,
      cancelledReason: true,
      completedAt: true,
      attendanceStatus: true,
      attendedAt: true,
      attendanceMarkedAt: true,
      meetingSharedAt: true,
      reminderSentAt: true,
      application: {
        select: {
          id: true,
          status: true,
          adminStatus: true,
          joinedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              business: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const now = Date.now();
  const summary = {
    scheduled: interviews.filter((item) => item.status === "SCHEDULED").length,
    next24h: interviews.filter((item) => {
      const at = item.scheduledAt.getTime();
      return item.status === "SCHEDULED" && at >= now && at <= now + 24 * 60 * 60 * 1000;
    }).length,
    needsMeetingLink: interviews.filter(
      (item) => item.status === "SCHEDULED" && item.mode === "VIRTUAL" && !item.meetingUrl
    ).length,
    pendingAttendance: interviews.filter(
      (item) => item.status === "COMPLETED" && item.attendanceStatus === "PENDING"
    ).length,
    reminderWindowMinutes: JOB_INTERVIEW_REMINDER_LEAD_MINUTES,
  };

  return NextResponse.json({
    summary,
    interviews: interviews.map((item) => ({
      ...item,
      scheduledAt: item.scheduledAt.toISOString(),
      rescheduledAt: item.rescheduledAt?.toISOString() || null,
      cancelledAt: item.cancelledAt?.toISOString() || null,
      completedAt: item.completedAt?.toISOString() || null,
      attendedAt: item.attendedAt?.toISOString() || null,
      attendanceMarkedAt: item.attendanceMarkedAt?.toISOString() || null,
      meetingSharedAt: item.meetingSharedAt?.toISOString() || null,
      reminderSentAt: item.reminderSentAt?.toISOString() || null,
      application: {
        ...item.application,
        joinedAt: item.application.joinedAt?.toISOString() || null,
      },
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        applicationId?: string;
        scheduledAt?: string;
        durationMinutes?: number;
        mode?: "VIRTUAL" | "IN_PERSON" | "PHONE";
        title?: string;
        adminNote?: string;
      }
    | null;

  const applicationId = body?.applicationId?.trim();
  const scheduledAt = parseDate(body?.scheduledAt);
  const durationMinutes = Number(body?.durationMinutes || 30);
  const mode = body?.mode || "VIRTUAL";
  const title = normalizeInterviewText(body?.title, 120);
  const adminNote = normalizeInterviewText(body?.adminNote, 800);

  if (!applicationId) {
    return NextResponse.json({ error: "Application is required" }, { status: 400 });
  }
  if (!scheduledAt) {
    return NextResponse.json({ error: "A valid interview date and time is required" }, { status: 400 });
  }
  if (!["VIRTUAL", "IN_PERSON", "PHONE"].includes(mode)) {
    return NextResponse.json({ error: "Invalid interview mode" }, { status: 400 });
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) {
    return NextResponse.json({ error: "Duration must be between 10 and 240 minutes" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      adminStatus: true,
      managerStatus: true,
      userId: true,
      jobId: true,
      interviews: {
        select: {
          roundNumber: true,
          status: true,
          scheduledAt: true,
          cancelledAt: true,
        },
      },
      job: {
        select: {
          title: true,
          businessId: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.managerStatus !== "MANAGER_APPROVED") {
    return NextResponse.json({ error: "Manager approval is required before interview scheduling" }, { status: 400 });
  }
  if (["REJECTED", "WITHDRAWN"].includes(application.status)) {
    return NextResponse.json({ error: "This application cannot receive new interview rounds" }, { status: 400 });
  }

  const nextRoundNumber =
    application.interviews.reduce((max, item) => Math.max(max, item.roundNumber), 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    const interview = await tx.jobApplicationInterview.create({
      data: {
        applicationId,
        roundNumber: nextRoundNumber,
        title: title || `Round ${nextRoundNumber}`,
        status: "SCHEDULED",
        mode,
        scheduledAt,
        durationMinutes,
        timezone: "Asia/Calcutta",
        adminNote: adminNote || null,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
      },
    });

    const nextInterviewAt = nextInterviewAtFromRounds([
      ...application.interviews,
      { status: "SCHEDULED", scheduledAt, cancelledAt: null },
    ]);

    await tx.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: "INTERVIEW_SCHEDULED",
        interviewAt: nextInterviewAt,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_CREATED_JOB_INTERVIEW_ROUND",
        entity: "JobApplicationInterview",
        details: `applicationId=${applicationId}, round=${nextRoundNumber}, scheduledAt=${scheduledAt.toISOString()}, mode=${mode}`,
      },
    });

    return interview;
  });

  await sendInAppNotification({
    userId: application.userId,
    title: "A new interview round was scheduled",
    message: `Round ${nextRoundNumber} for "${application.job.title}" is scheduled for ${scheduledAt.toLocaleString()}.`,
    type: "INFO",
    templateKey: "job.interview_round_created",
    payload: { applicationId, interviewId: created.id, roundNumber: nextRoundNumber },
  });

  if (application.adminStatus === "ADMIN_APPROVED") {
    await sendInAppNotification({
      userId: application.job.businessId,
      title: "Interview round added",
      message: `Round ${nextRoundNumber} for "${application.job.title}" was added by admin.`,
      type: "INFO",
      templateKey: "job.interview_round_created_business",
      payload: { applicationId, interviewId: created.id, roundNumber: nextRoundNumber },
    });
  }

  return NextResponse.json({
    message: "Interview round added",
    interview: {
      id: created.id,
      roundNumber: created.roundNumber,
      scheduledAt: created.scheduledAt.toISOString(),
    },
  });
}
