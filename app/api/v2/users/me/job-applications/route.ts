import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProfileDetails } from "@/lib/user-profile";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { userId: session.user.id },
    include: {
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

  return NextResponse.json({
    applications: applications.map((application) => ({
      id: application.id,
      status: application.status,
      coverNote: application.coverNote,
      businessNote: application.businessNote,
      interviewAt: application.interviewAt?.toISOString() || null,
      joinedAt: application.joinedAt?.toISOString() || null,
      reviewedAt: application.reviewedAt?.toISOString() || null,
      createdAt: application.createdAt.toISOString(),
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
  });
}
