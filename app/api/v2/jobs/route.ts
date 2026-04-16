import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPhysicalWorkPayoutBreakdown } from "@/lib/commission";
import { getUserJobMatch } from "@/lib/jobs";
import { parseProfileDetails } from "@/lib/user-profile";
import { getAppSettings } from "@/lib/system-settings";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cityFilter = searchParams.get("city")?.trim().toLowerCase() || "";
  const radiusFilterValue = Number(searchParams.get("radiusKm") || "");
  const radiusFilter = Number.isFinite(radiusFilterValue) && radiusFilterValue > 0 ? radiusFilterValue : null;

  const [user, skills, jobs, applications, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        profileDetails: true,
      },
    }),
    prisma.userSkill.findMany({
      where: { userId: session.user.id },
      include: {
        skill: {
          select: { label: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.jobPosting.findMany({
      where: { status: "OPEN" },
      include: {
        business: {
          select: { id: true, name: true },
        },
        applications: {
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
    }),
    prisma.jobApplication.findMany({
      where: { userId: session.user.id },
      select: {
        jobId: true,
        status: true,
      },
    }),
    getAppSettings(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = parseProfileDetails(user.profileDetails, settings.workTaxonomy);
  const userSkillLabels = skills.map((item) => item.skill.label);
  const applicationMap = new Map(applications.map((item) => [item.jobId, item.status]));

  const rows = jobs
    .map((job) => {
      const match = getUserJobMatch({
        userProfile: user.profileDetails,
        userSkills: userSkillLabels,
        requiredSkills: job.requiredSkills,
        requiredLanguages: job.requiredLanguages,
        city: job.city,
        state: job.state,
        pincode: job.pincode,
        latitude: job.latitude,
        longitude: job.longitude,
        hiringRadiusKm: job.hiringRadiusKm,
        jobCategory: job.jobCategory,
        workMode: job.workMode,
        employmentType: job.employmentType,
        workTaxonomy: settings.workTaxonomy,
      });
      const payout = getPhysicalWorkPayoutBreakdown(job.payAmount);

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        businessName: job.business.name || "Business",
        jobCategory: job.jobCategory,
        jobType: job.jobType,
        customJobType: job.customJobType,
        workMode: job.workMode,
        employmentType: job.employmentType,
        city: job.city,
        state: job.state,
        pincode: job.pincode,
        latitude: job.latitude,
        longitude: job.longitude,
        hiringRadiusKm: job.hiringRadiusKm,
        addressLine: job.addressLine,
        openings: job.openings,
        payAmount: job.payAmount,
        workerPayAmount: payout.workerAmount,
        commissionAmount: payout.commissionAmount,
        commissionRate: payout.commissionRate,
        budgetRequired: job.budgetRequired,
        payUnit: job.payUnit,
        shiftSummary: job.shiftSummary,
        startDate: job.startDate?.toISOString() || null,
        applicationDeadline: job.applicationDeadline?.toISOString() || null,
        requiredSkills: job.requiredSkills,
        requiredLanguages: job.requiredLanguages,
        minEducation: job.minEducation,
        createdAt: job.createdAt.toISOString(),
        applicationCount: job.applications.length,
        applicationStatus: applicationMap.get(job.id) || null,
        matchScore: match.score,
        matchReasons: match.reasons,
        matchedSkills: match.matchedSkills,
        matchedLanguages: match.matchedLanguages,
        distanceKm: match.distanceKm,
      };
    })
    .filter((job) => {
      const matchesCity = cityFilter ? job.city.toLowerCase().includes(cityFilter) : true;
      const matchesRadius = radiusFilter
        ? typeof job.distanceKm === "number"
          ? job.distanceKm <= radiusFilter
          : false
        : true;
      return matchesCity && matchesRadius;
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const nearbyCount = rows.filter((job) => {
    return (
      Boolean(typeof job.distanceKm === "number" && job.hiringRadiusKm && job.distanceKm <= job.hiringRadiusKm) ||
      Boolean(profile.city && job.city.toLowerCase() === profile.city.toLowerCase()) ||
      Boolean(profile.pincode && job.pincode && job.pincode === profile.pincode)
    );
  }).length;

  return NextResponse.json({
    jobs: rows,
    summary: {
      totalOpen: rows.length,
      strongMatches: rows.filter((job) => job.matchScore >= 4).length,
      appliedCount: rows.filter((job) => job.applicationStatus).length,
      nearbyCount,
    },
    filters: {
      city: profile.city,
      radiusKm: radiusFilter,
    },
  });
}
