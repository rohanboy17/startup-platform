import { NextResponse } from "next/server";
import { sendInAppNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  JOB_INTERVIEW_REMINDER_LEAD_MINUTES,
  JOB_INTERVIEW_REMINDER_SWEEP_MINUTES,
} from "@/lib/job-interviews";

function isAuthorized(req: Request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === configured) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${configured}`) {
    return true;
  }

  return false;
}

async function runReminderSweep() {
  const now = new Date();
  const reminderBoundary = new Date(now.getTime() + JOB_INTERVIEW_REMINDER_SWEEP_MINUTES * 60 * 1000);

  const interviews = await prisma.jobApplicationInterview.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledAt: {
        gte: now,
        lte: reminderBoundary,
      },
      application: {
        status: { notIn: ["REJECTED", "WITHDRAWN"] },
      },
    },
    select: {
      id: true,
      roundNumber: true,
      scheduledAt: true,
      applicationId: true,
      application: {
        select: {
          adminStatus: true,
          userId: true,
          job: {
            select: {
              id: true,
              title: true,
              businessId: true,
            },
          },
        },
      },
    },
  });

  for (const interview of interviews) {
    await Promise.all([
      sendInAppNotification({
        userId: interview.application.userId,
        title: "Interview reminder",
        message: `Round ${interview.roundNumber} for "${interview.application.job.title}" starts at ${interview.scheduledAt.toLocaleString()}.`,
        type: "INFO",
        templateKey: "job.interview_reminder_user",
        payload: {
          applicationId: interview.applicationId,
          interviewId: interview.id,
          jobId: interview.application.job.id,
        },
      }),
      interview.application.adminStatus === "ADMIN_APPROVED"
        ? sendInAppNotification({
            userId: interview.application.job.businessId,
            title: "Interview reminder",
            message: `Round ${interview.roundNumber} for "${interview.application.job.title}" starts at ${interview.scheduledAt.toLocaleString()}.`,
            type: "INFO",
            templateKey: "job.interview_reminder_business",
            payload: {
              applicationId: interview.applicationId,
              interviewId: interview.id,
              jobId: interview.application.job.id,
            },
          })
        : Promise.resolve(),
    ]);

    await prisma.jobApplicationInterview.update({
      where: { id: interview.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return NextResponse.json({
    message: "Interview reminder sweep completed",
    processed: interviews.length,
    reminderLeadMinutes: JOB_INTERVIEW_REMINDER_LEAD_MINUTES,
    reminderSweepMinutes: JOB_INTERVIEW_REMINDER_SWEEP_MINUTES,
  });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminderSweep();
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminderSweep();
}
