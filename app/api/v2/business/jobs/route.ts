import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { PHYSICAL_WORK_COMMISSION_RATE } from "@/lib/commission";
import { canManageBusinessCampaigns, getBusinessContext } from "@/lib/business-context";
import {
  DEFAULT_JOB_CATEGORIES,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PAY_UNIT_OPTIONS,
  JOB_WORK_MODE_OPTIONS,
  normalizeJobSelection,
} from "@/lib/job-categories";
import {
  normalizeCoordinate,
  normalizeJobDate,
  getJobBudgetRequired,
  normalizeJobSkills,
  normalizeOptionalText,
  normalizePincode,
  normalizeRadiusKm,
  normalizeStringArray,
} from "@/lib/jobs";

const WORK_MODES = new Set<string>(JOB_WORK_MODE_OPTIONS.map((item) => item.value));
const EMPLOYMENT_TYPES = new Set<string>(JOB_EMPLOYMENT_TYPE_OPTIONS.map((item) => item.value));
const PAY_UNITS = new Set<string>(JOB_PAY_UNIT_OPTIONS.map((item) => item.value));

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const jobs = await prisma.jobPosting.findMany({
    where: { businessId: context.businessUserId },
    include: {
      applications: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const jobsWithMetrics = jobs.map((job) => ({
    ...job,
    metrics: {
      totalApplications: job.applications.length,
      pendingManager: job.applications.filter((item) => item.status === "APPLIED").length,
      approvedForBusiness: job.applications.filter((item) => item.status === "SHORTLISTED").length,
      hired: job.applications.filter((item) => ["HIRED", "JOINED"].includes(item.status)).length,
    },
  }));

  return NextResponse.json({
    accessRole: context.accessRole,
    jobs: jobsWithMetrics,
    jobCategories: DEFAULT_JOB_CATEGORIES,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot create jobs" }, { status: 403 });
  }

  const businessAccount = await prisma.user.findUnique({
    where: { id: context.businessUserId },
    select: { kycStatus: true },
  });

  if (!businessAccount) {
    return NextResponse.json({ error: "Business account not found" }, { status: 404 });
  }
  if (businessAccount.kycStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Business KYC verification is required before posting jobs." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        title?: unknown;
        description?: unknown;
        jobCategory?: unknown;
        jobType?: unknown;
        customJobType?: unknown;
        workMode?: unknown;
        employmentType?: unknown;
        city?: unknown;
        state?: unknown;
        pincode?: unknown;
        addressLine?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        hiringRadiusKm?: unknown;
        openings?: unknown;
        payAmount?: unknown;
        payUnit?: unknown;
        shiftSummary?: unknown;
        startDate?: unknown;
        applicationDeadline?: unknown;
        requiredSkills?: unknown;
        requiredLanguages?: unknown;
        minEducation?: unknown;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const title = normalizeOptionalText(body.title, 120);
  const description = normalizeOptionalText(body.description, 2000);
  const selection = normalizeJobSelection(
    {
      jobCategory: normalizeOptionalText(body.jobCategory, 120),
      jobType: normalizeOptionalText(body.jobType, 120),
      customJobType: normalizeOptionalText(body.customJobType, 160),
    },
    DEFAULT_JOB_CATEGORIES
  );
  const workMode = normalizeOptionalText(body.workMode, 32);
  const employmentType = normalizeOptionalText(body.employmentType, 32);
  const city = normalizeOptionalText(body.city, 80);
  const state = normalizeOptionalText(body.state, 80);
  const pincode = normalizePincode(body.pincode);
  const addressLine = normalizeOptionalText(body.addressLine, 240);
  const latitude = normalizeCoordinate(body.latitude);
  const longitude = normalizeCoordinate(body.longitude);
  const hiringRadiusKm = normalizeRadiusKm(body.hiringRadiusKm);
  const openings = Number(body.openings);
  const payAmount = Number(body.payAmount);
  const payUnit = normalizeOptionalText(body.payUnit, 32);
  const shiftSummary = normalizeOptionalText(body.shiftSummary, 160);
  const startDate = normalizeJobDate(body.startDate);
  const applicationDeadline = normalizeJobDate(body.applicationDeadline);
  const requiredSkills = normalizeJobSkills(body.requiredSkills);
  const requiredLanguages = normalizeStringArray(body.requiredLanguages, 8, 40);
  const minEducation = normalizeOptionalText(body.minEducation, 120);

  if (!title || !description || !city || !state) {
    return NextResponse.json({ error: "Title, description, city, and state are required." }, { status: 400 });
  }
  if ("error" in selection) {
    return NextResponse.json({ error: selection.error }, { status: 400 });
  }
  if (!workMode || !WORK_MODES.has(workMode)) {
    return NextResponse.json({ error: "Invalid work mode" }, { status: 400 });
  }
  if (!employmentType || !EMPLOYMENT_TYPES.has(employmentType)) {
    return NextResponse.json({ error: "Invalid employment type" }, { status: 400 });
  }
  if (!payUnit || !PAY_UNITS.has(payUnit)) {
    return NextResponse.json({ error: "Invalid pay unit" }, { status: 400 });
  }
  if (Number.isNaN(openings) || openings < 1 || openings > 500) {
    return NextResponse.json({ error: "Openings must be between 1 and 500." }, { status: 400 });
  }
  if (Number.isNaN(payAmount) || payAmount <= 0) {
    return NextResponse.json({ error: "Pay amount must be greater than zero." }, { status: 400 });
  }
  if (startDate === "__INVALID__" || applicationDeadline === "__INVALID__") {
    return NextResponse.json({ error: "Invalid job date provided." }, { status: 400 });
  }
  if (startDate && applicationDeadline && applicationDeadline > startDate) {
    return NextResponse.json(
      { error: "Application deadline should be on or before the job start date." },
      { status: 400 }
    );
  }
  if ((latitude === null) !== (longitude === null)) {
    return NextResponse.json({ error: "Latitude and longitude must be provided together." }, { status: 400 });
  }
  if (typeof latitude === "number" && (latitude < -90 || latitude > 90)) {
    return NextResponse.json({ error: "Latitude must be between -90 and 90." }, { status: 400 });
  }
  if (typeof longitude === "number" && (longitude < -180 || longitude > 180)) {
    return NextResponse.json({ error: "Longitude must be between -180 and 180." }, { status: 400 });
  }

  const budgetRequired = getJobBudgetRequired(payAmount, openings);
  const wallet = await ensureBusinessWalletSynced(context.businessUserId);
  if (!wallet || wallet.balance < budgetRequired) {
    return NextResponse.json(
      {
        error: `Add at least INR ${budgetRequired.toFixed(2)} to your business wallet before posting this job.`,
      },
      { status: 400 }
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.jobPosting.create({
      data: {
        businessId: context.businessUserId,
        title,
        description,
        jobCategory: selection.jobCategory,
        jobType: selection.jobType,
        customJobType: selection.customJobType,
        workMode: workMode as "WORK_FROM_OFFICE" | "WORK_IN_FIELD" | "HYBRID",
        employmentType: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "DAILY_GIG" | "INTERNSHIP",
        city,
        state,
        pincode,
        addressLine,
        latitude,
        longitude,
        hiringRadiusKm,
        openings,
        payAmount,
        commissionRate: PHYSICAL_WORK_COMMISSION_RATE,
        budgetRequired,
        payUnit: payUnit as "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "FIXED",
        shiftSummary,
        startDate,
        applicationDeadline,
        requiredSkills,
        requiredLanguages,
        minEducation,
        status: "PENDING_REVIEW",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "JOB_CREATED",
        entity: "JobPosting",
        details: `jobId=${created.id}, businessId=${context.businessUserId}, city=${city}, openings=${openings}, budgetRequired=${budgetRequired}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: context.actorUserId,
        actorRole: session.user.role,
        action: "JOB_CREATED",
        details: `jobId=${created.id}, title=${title}, city=${city}, state=${state}, workMode=${workMode}, employmentType=${employmentType}, budgetRequired=${budgetRequired}`,
      },
    });

    return created;
  });

  return NextResponse.json({ message: "Job submitted for admin verification", job }, { status: 201 });
}
