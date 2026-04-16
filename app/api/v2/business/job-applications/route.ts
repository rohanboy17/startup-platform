import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import { prisma } from "@/lib/prisma";
import { parseProfileDetails } from "@/lib/user-profile";
import { getWorkExperienceMap } from "@/lib/work-experience";
import { getAppSettings } from "@/lib/system-settings";
import { getWorkTaxonomyLabelBySlug } from "@/lib/work-taxonomy";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const settings = await getAppSettings();

  const applications = await prisma.jobApplication.findMany({
    where: {
      job: {
        businessId: context.businessUserId,
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      managerStatus: true,
      adminStatus: true,
      managerReason: true,
      adminReason: true,
      coverNote: true,
      businessNote: true,
      interviewAt: true,
      joinedAt: true,
      createdAt: true,
      updatedAt: true,
      interviews: {
        orderBy: { roundNumber: "asc" },
        select: {
          id: true,
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
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          jobCategory: true,
          jobType: true,
          customJobType: true,
          city: true,
          state: true,
          workMode: true,
          employmentType: true,
          payAmount: true,
          commissionRate: true,
          payUnit: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          skills: {
            include: {
              skill: {
                select: {
                  label: true,
                },
              },
            },
          },
          profileDetails: true,
        },
      },
    },
  });

  const experienceMap = await getWorkExperienceMap(applications.map((item) => item.user.id));

  return NextResponse.json({
    accessRole: context.accessRole,
    canManage: canManageBusinessCampaigns(context.accessRole),
    applications: applications.map((item) => ({
      ...item,
      interviewAt: item.interviewAt?.toISOString() || null,
      joinedAt: item.joinedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      interviews: item.interviews.map((interview) => ({
        ...interview,
        scheduledAt: interview.scheduledAt.toISOString(),
        rescheduledAt: interview.rescheduledAt?.toISOString() || null,
        cancelledAt: interview.cancelledAt?.toISOString() || null,
        completedAt: interview.completedAt?.toISOString() || null,
        attendedAt: interview.attendedAt?.toISOString() || null,
        attendanceMarkedAt: interview.attendanceMarkedAt?.toISOString() || null,
        meetingSharedAt: interview.meetingSharedAt?.toISOString() || null,
        reminderSentAt: interview.reminderSentAt?.toISOString() || null,
      })),
      user: {
        id: item.user.id,
        name: item.user.name,
        skills: Array.from(
          new Set(
            item.user.skills
              .map((skillLink) => skillLink.skill.label?.trim())
              .filter((value): value is string => Boolean(value))
          )
        ),
        profile: (() => {
          const profile = parseProfileDetails(item.user.profileDetails, settings.workTaxonomy);
          return {
            ...profile,
            preferredWorkCategoryLabels: profile.preferredWorkCategories.map(
              (slug) => getWorkTaxonomyLabelBySlug(slug, settings.workTaxonomy) || slug
            ),
          };
        })(),
        experience: experienceMap.get(item.user.id) || null,
      },
    })),
  });
}
