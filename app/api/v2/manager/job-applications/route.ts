import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProfileDetails } from "@/lib/user-profile";
import { getWorkExperienceMap } from "@/lib/work-experience";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: {
      status: "APPLIED",
      managerStatus: "PENDING",
      adminStatus: "PENDING",
      job: {
        status: "OPEN",
      },
    },
    include: {
      job: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          profileDetails: true,
          totalApproved: true,
          totalRejected: true,
          level: true,
          isSuspicious: true,
          suspiciousReason: true,
          skills: {
            include: {
              skill: {
                select: { label: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const experienceMap = await getWorkExperienceMap(applications.map((application) => application.user.id));

  return NextResponse.json({
    applications: applications.map((application) => {
      const profile = parseProfileDetails(application.user.profileDetails);
      return {
        id: application.id,
        status: application.status,
        managerStatus: application.managerStatus,
        adminStatus: application.adminStatus,
        coverNote: application.coverNote,
        createdAt: application.createdAt.toISOString(),
        user: {
          id: application.user.id,
          name: application.user.name,
          email: application.user.email,
          mobile: application.user.mobile,
          level: application.user.level,
          totalApproved: application.user.totalApproved,
          totalRejected: application.user.totalRejected,
          isSuspicious: application.user.isSuspicious,
          suspiciousReason: application.user.suspiciousReason,
          profile: {
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode,
            address: profile.address,
            workMode: profile.workMode,
            workTime: profile.workTime,
            workingPreference: profile.workingPreference,
            internshipPreference: profile.internshipPreference,
            educationQualification: profile.educationQualification,
            languages: profile.languages,
          },
          skills: application.user.skills.map((item) => item.skill.label),
          experience: experienceMap.get(application.user.id) || null,
        },
        job: {
          id: application.job.id,
          title: application.job.title,
          description: application.job.description,
          jobCategory: application.job.jobCategory,
          jobType: application.job.customJobType || application.job.jobType,
          city: application.job.city,
          state: application.job.state,
          workMode: application.job.workMode,
          employmentType: application.job.employmentType,
          payAmount: application.job.payAmount,
          payUnit: application.job.payUnit,
          business: {
            id: application.job.business.id,
            name: application.job.business.name,
            email: application.job.business.email,
          },
        },
      };
    }),
  });
}
