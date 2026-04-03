import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  normalizeJobSkills,
  normalizeOptionalText,
  normalizePincode,
  normalizeRadiusKm,
  normalizeStringArray,
} from "@/lib/jobs";
import { parseProfileDetails } from "@/lib/user-profile";

const WORK_MODES = new Set<string>(JOB_WORK_MODE_OPTIONS.map((item) => item.value));
const EMPLOYMENT_TYPES = new Set<string>(JOB_EMPLOYMENT_TYPE_OPTIONS.map((item) => item.value));
const PAY_UNITS = new Set<string>(JOB_PAY_UNIT_OPTIONS.map((item) => item.value));

type JobAction = "PAUSE" | "REOPEN" | "CLOSE" | "FILL";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const { jobId } = await params;
  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, businessId: context.businessUserId },
    include: {
      applications: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              profileDetails: true,
              skills: {
                include: {
                  skill: {
                    select: { label: true, slug: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    accessRole: context.accessRole,
    job: {
      ...job,
      applications: job.applications.map((application) => {
        const profile = parseProfileDetails(application.user.profileDetails);
        return {
          ...application,
          user: {
            id: application.user.id,
            name: application.user.name,
            email: application.user.email,
            mobile: application.user.mobile,
            profile: {
              city: profile.city,
              state: profile.state,
              pincode: profile.pincode,
              latitude: profile.latitude,
              longitude: profile.longitude,
              address: profile.address,
              workMode: profile.workMode,
              workTime: profile.workTime,
              workingPreference: profile.workingPreference,
              educationQualification: profile.educationQualification,
              languages: profile.languages,
            },
            skills: application.user.skills.map((item) => item.skill.label),
          },
        };
      }),
    },
    jobCategories: DEFAULT_JOB_CATEGORIES,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot manage jobs" }, { status: 403 });
  }

  const { jobId } = await params;
  const body = (await req.json().catch(() => null)) as { action?: JobAction } | null;
  const action = body?.action;

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, businessId: context.businessUserId },
    select: { id: true, title: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const nextStatus =
    action === "PAUSE" ? "PAUSED" : action === "REOPEN" ? "OPEN" : action === "FILL" ? "FILLED" : "CLOSED";

  if (action === "PAUSE" && job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be paused" }, { status: 400 });
  }
  if (action === "REOPEN" && !["PAUSED", "CLOSED"].includes(job.status)) {
    return NextResponse.json({ error: "Only paused or closed jobs can be reopened" }, { status: 400 });
  }
  if (action === "CLOSE" && ["CLOSED", "FILLED"].includes(job.status)) {
    return NextResponse.json({ error: "Job is already closed" }, { status: 400 });
  }
  if (action === "FILL" && job.status === "FILLED") {
    return NextResponse.json({ error: "Job is already marked filled" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.jobPosting.update({
      where: { id: jobId },
      data: { status: nextStatus as "OPEN" | "PAUSED" | "CLOSED" | "FILLED" },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: `BUSINESS_${action}_JOB`,
        entity: "JobPosting",
        details: `jobId=${jobId}, from=${job.status}, to=${nextStatus}, businessId=${context.businessUserId}`,
      },
    });

    return next;
  });

  return NextResponse.json({
    message:
      action === "PAUSE"
        ? "Job paused"
        : action === "REOPEN"
          ? "Job reopened"
          : action === "FILL"
            ? "Job marked as filled"
            : "Job closed",
    job: updated,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessCampaigns(context.accessRole)) {
    return NextResponse.json({ error: "This business role cannot manage jobs" }, { status: 403 });
  }

  const { jobId } = await params;
  const existing = await prisma.jobPosting.findFirst({
    where: { id: jobId, businessId: context.businessUserId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
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

  const title = normalizeOptionalText(body.title, 120) || existing.title;
  const description = normalizeOptionalText(body.description, 2000) || existing.description;
  const selection = normalizeJobSelection(
    {
      jobCategory: normalizeOptionalText(body.jobCategory, 120) ?? existing.jobCategory,
      jobType: normalizeOptionalText(body.jobType, 120) ?? existing.jobType,
      customJobType:
        body.customJobType === undefined
          ? existing.customJobType
          : normalizeOptionalText(body.customJobType, 160),
    },
    DEFAULT_JOB_CATEGORIES
  );
  const workMode = normalizeOptionalText(body.workMode, 32) || existing.workMode;
  const employmentType = normalizeOptionalText(body.employmentType, 32) || existing.employmentType;
  const city = normalizeOptionalText(body.city, 80) || existing.city;
  const state = normalizeOptionalText(body.state, 80) || existing.state;
  const pincode = body.pincode === undefined ? existing.pincode : normalizePincode(body.pincode);
  const addressLine =
    body.addressLine === undefined ? existing.addressLine : normalizeOptionalText(body.addressLine, 240);
  const latitude = body.latitude === undefined ? existing.latitude : normalizeCoordinate(body.latitude);
  const longitude = body.longitude === undefined ? existing.longitude : normalizeCoordinate(body.longitude);
  const hiringRadiusKm =
    body.hiringRadiusKm === undefined ? existing.hiringRadiusKm : normalizeRadiusKm(body.hiringRadiusKm);
  const openings = body.openings === undefined ? existing.openings : Number(body.openings);
  const payAmount = body.payAmount === undefined ? existing.payAmount : Number(body.payAmount);
  const payUnit = normalizeOptionalText(body.payUnit, 32) || existing.payUnit;
  const shiftSummary =
    body.shiftSummary === undefined ? existing.shiftSummary : normalizeOptionalText(body.shiftSummary, 160);
  const startDate = body.startDate === undefined ? existing.startDate : normalizeJobDate(body.startDate);
  const applicationDeadline =
    body.applicationDeadline === undefined
      ? existing.applicationDeadline
      : normalizeJobDate(body.applicationDeadline);
  const requiredSkills =
    body.requiredSkills === undefined ? existing.requiredSkills : normalizeJobSkills(body.requiredSkills);
  const requiredLanguages =
    body.requiredLanguages === undefined
      ? existing.requiredLanguages
      : normalizeStringArray(body.requiredLanguages, 8, 40);
  const minEducation =
    body.minEducation === undefined ? existing.minEducation : normalizeOptionalText(body.minEducation, 120);

  if ("error" in selection) {
    return NextResponse.json({ error: selection.error }, { status: 400 });
  }
  if (!WORK_MODES.has(String(workMode))) {
    return NextResponse.json({ error: "Invalid work mode" }, { status: 400 });
  }
  if (!EMPLOYMENT_TYPES.has(String(employmentType))) {
    return NextResponse.json({ error: "Invalid employment type" }, { status: 400 });
  }
  if (!PAY_UNITS.has(String(payUnit))) {
    return NextResponse.json({ error: "Invalid pay unit" }, { status: 400 });
  }
  if (Number.isNaN(Number(openings)) || Number(openings) < 1 || Number(openings) > 500) {
    return NextResponse.json({ error: "Openings must be between 1 and 500." }, { status: 400 });
  }
  if (Number.isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
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

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.jobPosting.update({
      where: { id: jobId },
      data: {
        title,
        description,
        jobCategory: selection.jobCategory,
        jobType: selection.jobType,
        customJobType: selection.customJobType,
        workMode: workMode as "WORK_FROM_OFFICE" | "WORK_IN_FIELD" | "HYBRID",
        employmentType: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "DAILY_GIG",
        city,
        state,
        pincode,
        addressLine,
        latitude,
        longitude,
        hiringRadiusKm,
        openings: Number(openings),
        payAmount: Number(payAmount),
        payUnit: payUnit as "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "FIXED",
        shiftSummary,
        startDate,
        applicationDeadline,
        requiredSkills,
        requiredLanguages,
        minEducation,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "JOB_UPDATED",
        entity: "JobPosting",
        details: `jobId=${jobId}, city=${city}, state=${state}, status=${next.status}`,
      },
    });

    return next;
  });

  return NextResponse.json({ message: "Job updated", job: updated });
}
