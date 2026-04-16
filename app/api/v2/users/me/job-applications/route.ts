import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { parseProfileDetails } from "@/lib/user-profile";
import { getWorkExperienceMap } from "@/lib/work-experience";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { userId: session.user.id },
    include: {
      interviews: {
        orderBy: { roundNumber: "asc" },
      },
      job: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      profileDetails: true,
    },
  });

  const parsedProfile = parseProfileDetails(profile?.profileDetails);
  const experience = (await getWorkExperienceMap([session.user.id])).get(session.user.id);

  return NextResponse.json({
    applications: applications.map((application) => ({
      ...(getPhysicalWorkPayoutBreakdown(application.job.payAmount)),
      id: application.id,
      status: application.status,
      managerStatus: application.managerStatus,
      adminStatus: application.adminStatus,
      managerReason: application.managerReason,
      adminReason: application.adminReason,
      coverNote: application.coverNote,
      businessNote: application.businessNote,
      interviewAt: application.interviewAt?.toISOString() || null,
      joinedAt: application.joinedAt?.toISOString() || null,
      reviewedAt: application.reviewedAt?.toISOString() || null,
      createdAt: application.createdAt.toISOString(),
      interviews: application.interviews.map((interview) => ({
        id: interview.id,
        roundNumber: interview.roundNumber,
        title: interview.title,
        status: interview.status,
        mode: interview.mode,
        scheduledAt: interview.scheduledAt.toISOString(),
        durationMinutes: interview.durationMinutes,
        timezone: interview.timezone,
        locationNote: interview.locationNote,
        meetingProvider: interview.meetingProvider,
        meetingUrl: interview.meetingUrl,
        adminNote: interview.adminNote,
        interviewerNotes: interview.interviewerNotes,
        scorecard: interview.scorecard,
        rescheduledAt: interview.rescheduledAt?.toISOString() || null,
        rescheduleReason: interview.rescheduleReason,
        cancelledAt: interview.cancelledAt?.toISOString() || null,
        cancelledReason: interview.cancelledReason,
        completedAt: interview.completedAt?.toISOString() || null,
        attendanceStatus: interview.attendanceStatus,
        attendedAt: interview.attendedAt?.toISOString() || null,
        attendanceMarkedAt: interview.attendanceMarkedAt?.toISOString() || null,
        meetingSharedAt: interview.meetingSharedAt?.toISOString() || null,
        reminderSentAt: interview.reminderSentAt?.toISOString() || null,
      })),
      job: {
        id: application.job.id,
        title: application.job.title,
        description: application.job.description,
        businessName: application.job.business.name || "Business",
        city: application.job.city,
        state: application.job.state,
        pincode: application.job.pincode,
        workMode: application.job.workMode,
        employmentType: application.job.employmentType,
        payAmount: application.job.payAmount,
        commissionRate: application.job.commissionRate,
        payUnit: application.job.payUnit,
        status: application.job.status,
      },
    })),
    summary: {
      total: applications.length,
      applied: applications.filter((item) => item.status === "APPLIED").length,
      shortlisted: applications.filter((item) => item.status === "SHORTLISTED").length,
      interviewed: applications.filter((item) => item.status === "INTERVIEW_SCHEDULED").length,
      hired: applications.filter((item) => item.status === "HIRED").length,
      joined: applications.filter((item) => item.status === "JOINED").length,
      rejected: applications.filter((item) => item.status === "REJECTED").length,
    },
    profile: {
      city: parsedProfile.city,
      state: parsedProfile.state,
      pincode: parsedProfile.pincode,
    },
    experience,
  });
}
