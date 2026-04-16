import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { sendInAppNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  nextInterviewAtFromRounds,
  normalizeInterviewScorecard,
  normalizeInterviewText,
} from "@/lib/job-interviews";

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const next = new Date(value.trim());
  return Number.isNaN(next.getTime()) ? null : next;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { interviewId } = await params;
  const body = (await req.json().catch(() => null)) as
    | {
        action?: "RESCHEDULE" | "CANCEL" | "COMPLETE" | "MARK_ATTENDANCE" | "CONFIRM_JOINED";
        scheduledAt?: string;
        durationMinutes?: number;
        mode?: "VIRTUAL" | "IN_PERSON" | "PHONE";
        title?: string;
        adminNote?: string;
        interviewerNotes?: string;
        attendanceStatus?: "PENDING" | "ATTENDED" | "NO_SHOW";
        cancelledReason?: string;
        rescheduleReason?: string;
        scorecard?: unknown;
      }
    | null;

  const action = body?.action;
  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const interview = await prisma.jobApplicationInterview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      applicationId: true,
      roundNumber: true,
      status: true,
      mode: true,
      scheduledAt: true,
      durationMinutes: true,
      title: true,
      attendanceStatus: true,
      application: {
        select: {
          id: true,
          status: true,
          adminStatus: true,
          userId: true,
          job: {
            select: {
              id: true,
              title: true,
              businessId: true,
            },
          },
          interviews: {
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              cancelledAt: true,
            },
          },
        },
      },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Interview round not found" }, { status: 404 });
  }

  const application = interview.application;
  const scheduledAt = parseDate(body?.scheduledAt);
  const durationMinutes = Number(body?.durationMinutes || interview.durationMinutes || 30);
  const mode = body?.mode || interview.mode;
  const title = normalizeInterviewText(body?.title, 120);
  const adminNote = normalizeInterviewText(body?.adminNote, 800);
  const interviewerNotes = normalizeInterviewText(body?.interviewerNotes, 1200);
  const cancelledReason = normalizeInterviewText(body?.cancelledReason, 500);
  const rescheduleReason = normalizeInterviewText(body?.rescheduleReason, 500);
  const scorecard = normalizeInterviewScorecard(body?.scorecard);
  const attendanceStatus = body?.attendanceStatus || interview.attendanceStatus;

  if (action === "RESCHEDULE") {
    if (!scheduledAt) {
      return NextResponse.json({ error: "A valid new date and time is required" }, { status: 400 });
    }
    if (!["VIRTUAL", "IN_PERSON", "PHONE"].includes(mode)) {
      return NextResponse.json({ error: "Invalid interview mode" }, { status: 400 });
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) {
      return NextResponse.json({ error: "Duration must be between 10 and 240 minutes" }, { status: 400 });
    }
  }

  if (action === "MARK_ATTENDANCE" && !["PENDING", "ATTENDED", "NO_SHOW"].includes(attendanceStatus)) {
    return NextResponse.json({ error: "Invalid attendance status" }, { status: 400 });
  }

  if (action === "CONFIRM_JOINED" && !["HIRED", "JOINED"].includes(application.status)) {
    return NextResponse.json({ error: "Only hired candidates can be marked joined" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    let nextStatus = application.status;
    let nextInterviewAt = nextInterviewAtFromRounds(application.interviews);

    if (action === "RESCHEDULE" && scheduledAt) {
      await tx.jobApplicationInterview.update({
        where: { id: interviewId },
        data: {
          status: "SCHEDULED",
          scheduledAt,
          durationMinutes,
          mode,
          title: title || interview.title,
          adminNote: adminNote || null,
          rescheduledAt: new Date(),
          rescheduleReason: rescheduleReason || null,
          cancelledAt: null,
          cancelledReason: null,
          reminderSentAt: null,
          updatedByUserId: session.user.id,
        },
      });
      nextStatus = "INTERVIEW_SCHEDULED";
      nextInterviewAt = nextInterviewAtFromRounds(
        application.interviews.map((item) =>
          item.id === interviewId
            ? { ...item, status: "SCHEDULED", scheduledAt, cancelledAt: null }
            : item
        )
      );
    }

    if (action === "CANCEL") {
      await tx.jobApplicationInterview.update({
        where: { id: interviewId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledReason: cancelledReason || "Interview cancelled by admin",
          updatedByUserId: session.user.id,
        },
      });
      nextInterviewAt = nextInterviewAtFromRounds(
        application.interviews.map((item) =>
          item.id === interviewId
            ? { ...item, status: "CANCELLED", cancelledAt: new Date() }
            : item
        )
      );
      if (!nextInterviewAt && !["HIRED", "JOINED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
        nextStatus = "SHORTLISTED";
      }
    }

    if (action === "COMPLETE") {
      const finalAttendance =
        attendanceStatus === "ATTENDED" || attendanceStatus === "NO_SHOW" ? attendanceStatus : interview.attendanceStatus;
      await tx.jobApplicationInterview.update({
        where: { id: interviewId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          interviewerNotes: interviewerNotes || null,
          adminNote: adminNote || null,
          scorecard: scorecard ?? Prisma.DbNull,
          attendanceStatus: finalAttendance,
          attendedAt: finalAttendance === "ATTENDED" ? new Date() : null,
          attendanceMarkedAt: finalAttendance === "ATTENDED" || finalAttendance === "NO_SHOW" ? new Date() : null,
          attendanceMarkedByUserId:
            finalAttendance === "ATTENDED" || finalAttendance === "NO_SHOW" ? session.user.id : null,
          updatedByUserId: session.user.id,
        },
      });
      nextInterviewAt = nextInterviewAtFromRounds(
        application.interviews.map((item) =>
          item.id === interviewId ? { ...item, status: "COMPLETED" } : item
        )
      );
      if (!nextInterviewAt && !["HIRED", "JOINED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
        nextStatus = "SHORTLISTED";
      }
    }

    if (action === "MARK_ATTENDANCE") {
      await tx.jobApplicationInterview.update({
        where: { id: interviewId },
        data: {
          attendanceStatus,
          attendedAt: attendanceStatus === "ATTENDED" ? new Date() : null,
          attendanceMarkedAt: new Date(),
          attendanceMarkedByUserId: session.user.id,
          updatedByUserId: session.user.id,
        },
      });
    }

    if (action === "CONFIRM_JOINED") {
      await tx.jobApplication.update({
        where: { id: application.id },
        data: {
          status: "JOINED",
          joinedAt: new Date(),
          interviewAt: nextInterviewAt,
        },
      });
      await tx.jobApplicationInterview.update({
        where: { id: interviewId },
        data: {
          attendanceStatus: "ATTENDED",
          attendedAt: new Date(),
          attendanceMarkedAt: new Date(),
          attendanceMarkedByUserId: session.user.id,
          updatedByUserId: session.user.id,
        },
      });
      nextStatus = "JOINED";
    } else {
      await tx.jobApplication.update({
        where: { id: application.id },
        data: {
          status: nextStatus as
            | "APPLIED"
            | "SHORTLISTED"
            | "INTERVIEW_SCHEDULED"
            | "REJECTED"
            | "HIRED"
            | "JOINED"
            | "WITHDRAWN",
          interviewAt: nextInterviewAt,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: `ADMIN_${action}_JOB_INTERVIEW`,
        entity: "JobApplicationInterview",
        details: `interviewId=${interviewId}, applicationId=${application.id}, round=${interview.roundNumber}`,
      },
    });

    return {
      nextStatus,
      nextInterviewAt,
    };
  });

  const notifyBase = {
    applicationId: application.id,
    interviewId,
    roundNumber: interview.roundNumber,
  };

  if (action === "RESCHEDULE" && scheduledAt) {
    await Promise.all([
      sendInAppNotification({
        userId: application.userId,
        title: "Interview rescheduled",
        message: `Round ${interview.roundNumber} for "${application.job.title}" is now scheduled for ${scheduledAt.toLocaleString()}.`,
        type: "INFO",
        templateKey: "job.interview_rescheduled_user",
        payload: notifyBase,
      }),
      application.adminStatus === "ADMIN_APPROVED"
        ? sendInAppNotification({
            userId: application.job.businessId,
            title: "Interview rescheduled",
            message: `Round ${interview.roundNumber} for "${application.job.title}" was rescheduled by admin.`,
            type: "INFO",
            templateKey: "job.interview_rescheduled_business",
            payload: notifyBase,
          })
        : Promise.resolve(),
    ]);
  }

  if (action === "CANCEL") {
    await Promise.all([
      sendInAppNotification({
        userId: application.userId,
        title: "Interview cancelled",
        message: `Round ${interview.roundNumber} for "${application.job.title}" was cancelled.${cancelledReason ? ` Reason: ${cancelledReason}` : ""}`,
        type: "WARNING",
        templateKey: "job.interview_cancelled_user",
        payload: notifyBase,
      }),
      application.adminStatus === "ADMIN_APPROVED"
        ? sendInAppNotification({
            userId: application.job.businessId,
            title: "Interview cancelled",
            message: `Round ${interview.roundNumber} for "${application.job.title}" was cancelled by admin.`,
            type: "INFO",
            templateKey: "job.interview_cancelled_business",
            payload: notifyBase,
          })
        : Promise.resolve(),
    ]);
  }

  if (action === "COMPLETE") {
    await Promise.all([
      sendInAppNotification({
        userId: application.userId,
        title: "Interview round updated",
        message: `Round ${interview.roundNumber} for "${application.job.title}" was marked complete.`,
        type: "INFO",
        templateKey: "job.interview_completed_user",
        payload: notifyBase,
      }),
      application.adminStatus === "ADMIN_APPROVED"
        ? sendInAppNotification({
            userId: application.job.businessId,
            title: "Interview round updated",
            message: `Round ${interview.roundNumber} for "${application.job.title}" was marked complete by admin.`,
            type: "INFO",
            templateKey: "job.interview_completed_business",
            payload: notifyBase,
          })
        : Promise.resolve(),
    ]);
  }

  if (action === "CONFIRM_JOINED") {
    await Promise.all([
      sendInAppNotification({
        userId: application.userId,
        title: "Joined status confirmed",
        message: `Your joined status for "${application.job.title}" was confirmed by admin.`,
        type: "SUCCESS",
        templateKey: "job.joined_confirmed_user",
        payload: notifyBase,
      }),
      sendInAppNotification({
        userId: application.job.businessId,
        title: "Joined status confirmed",
        message: `Joined status for "${application.job.title}" was confirmed by admin.`,
        type: "SUCCESS",
        templateKey: "job.joined_confirmed_business",
        payload: notifyBase,
      }),
    ]);
  }

  return NextResponse.json({
    message:
      action === "RESCHEDULE"
        ? "Interview rescheduled"
        : action === "CANCEL"
          ? "Interview cancelled"
          : action === "COMPLETE"
            ? "Interview round completed"
            : action === "MARK_ATTENDANCE"
              ? "Attendance updated"
              : "Joined status confirmed",
    applicationStatus: updated.nextStatus,
    nextInterviewAt: updated.nextInterviewAt?.toISOString() || null,
  });
}
