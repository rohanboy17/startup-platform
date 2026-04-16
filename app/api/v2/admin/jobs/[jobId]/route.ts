import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInAppNotification } from "@/lib/notify";
import { PHYSICAL_WORK_COMMISSION_RATE } from "@/lib/commission";
import { ensureBusinessWalletSynced } from "@/lib/business-wallet";
import { applyJobBudgetDelta, getJobBudgetDelta } from "@/lib/job-budget";
import { normalizeJobSelection } from "@/lib/job-categories";
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
import { getAppSettings } from "@/lib/system-settings";

type JobAction = "APPROVE" | "REJECT" | "PAUSE" | "REOPEN" | "CLOSE" | "FILL";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { jobId } = await params;
  const body = (await req.json().catch(() => null)) as { action?: JobAction; reviewNote?: string } | null;
  const action = body?.action;
  const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim().slice(0, 500) : "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      status: true,
      businessId: true,
      budgetRequired: true,
      lockedBudgetAmount: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const nextStatus =
    action === "APPROVE"
      ? "OPEN"
      : action === "REJECT"
        ? "REJECTED"
        : action === "PAUSE"
          ? "PAUSED"
          : action === "REOPEN"
            ? "OPEN"
            : action === "FILL"
              ? "FILLED"
              : "CLOSED";

  if (action === "APPROVE" && !["PENDING_REVIEW", "REJECTED"].includes(job.status)) {
    return NextResponse.json({ error: "Only pending or rejected jobs can be approved." }, { status: 400 });
  }
  if (action === "REJECT" && !["PENDING_REVIEW", "OPEN"].includes(job.status)) {
    return NextResponse.json({ error: "Only pending or live jobs can be rejected." }, { status: 400 });
  }
  if (action === "PAUSE" && job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be paused." }, { status: 400 });
  }
  if (action === "REOPEN" && !["PAUSED", "CLOSED", "FILLED"].includes(job.status)) {
    return NextResponse.json({ error: "Only paused, closed, or filled jobs can be reopened." }, { status: 400 });
  }
  if (action === "CLOSE" && ["CLOSED"].includes(job.status)) {
    return NextResponse.json({ error: "Job is already closed." }, { status: 400 });
  }
  if (action === "FILL" && job.status === "FILLED") {
    return NextResponse.json({ error: "Job is already filled." }, { status: 400 });
  }

  const budgetDelta = action === "APPROVE" ? getJobBudgetDelta(job.budgetRequired, job.lockedBudgetAmount) : 0;
  if (budgetDelta > 0) {
    const wallet = await ensureBusinessWalletSynced(job.businessId);
    if (!wallet || wallet.balance < budgetDelta) {
      return NextResponse.json(
        {
          error: `This business needs at least INR ${budgetDelta.toFixed(2)} more in the wallet before this job can be approved.`,
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (action === "APPROVE" && budgetDelta !== 0) {
      await applyJobBudgetDelta(tx, {
        businessId: job.businessId,
        jobTitle: job.title,
        budgetDelta,
      });
    }

    const next = await tx.jobPosting.update({
      where: { id: jobId },
      data: {
        status: nextStatus as "PENDING_REVIEW" | "OPEN" | "REJECTED" | "PAUSED" | "CLOSED" | "FILLED",
        reviewNote: reviewNote || null,
        ...(action === "APPROVE"
          ? {
              lockedBudgetAmount: job.budgetRequired,
            }
          : {}),
        ...(action === "APPROVE"
          ? {
              approvedAt: new Date(),
              approvedByUserId: session.user.id,
              rejectedAt: null,
              rejectedByUserId: null,
            }
          : {}),
        ...(action === "REJECT"
          ? {
              rejectedAt: new Date(),
              rejectedByUserId: session.user.id,
            }
          : {}),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: `ADMIN_${action}_JOB`,
        entity: "JobPosting",
        details: `jobId=${jobId}, from=${job.status}, to=${nextStatus}, businessId=${job.businessId}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        action: `ADMIN_${action}_JOB`,
        details: `jobId=${jobId}, from=${job.status}, to=${nextStatus}, businessId=${job.businessId}`,
      },
    });

    return next;
  });

  await sendInAppNotification({
    userId: job.businessId,
    title:
      action === "APPROVE"
        ? "Job approved by admin"
        : action === "REJECT"
          ? "Job rejected by admin"
          : action === "PAUSE"
            ? "Job paused by admin"
            : action === "REOPEN"
              ? "Job reopened by admin"
              : action === "FILL"
                ? "Job marked filled by admin"
                : "Job closed by admin",
    message:
      action === "APPROVE"
        ? `Your job "${job.title}" passed admin verification, is now live for users, and its budget has been reserved from the business wallet.`
        : action === "REJECT"
          ? `Your job "${job.title}" was rejected by admin review.${reviewNote ? ` Note: ${reviewNote}` : ""}`
          : action === "PAUSE"
            ? `Your job "${job.title}" was paused by admin review.`
            : action === "REOPEN"
              ? `Your job "${job.title}" was reopened by admin review.`
              : action === "FILL"
                ? `Your job "${job.title}" was marked filled by admin.`
                : `Your job "${job.title}" was closed by admin review.`,
    type: action === "APPROVE" || action === "REOPEN" ? "SUCCESS" : action === "REJECT" || action === "PAUSE" ? "WARNING" : "INFO",
    templateKey: `admin.job_${action.toLowerCase()}`,
    payload: {
      jobId,
      status: updated.status,
    },
  });

  return NextResponse.json({
    message:
      action === "APPROVE"
        ? "Job approved"
        : action === "REJECT"
          ? "Job rejected"
          : action === "PAUSE"
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
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { jobId } = await params;
  const existing = await prisma.jobPosting.findUnique({
    where: { id: jobId },
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
  const settings = await getAppSettings();
  const workModes = new Set(settings.jobWorkModeOptions.map((item) => item.value));
  const employmentTypes = new Set(settings.jobEmploymentTypeOptions.map((item) => item.value));
  const payUnits = new Set(settings.jobPayUnitOptions.map((item) => item.value));

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
    settings.jobCategories
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
  if (!workModes.has(String(workMode))) {
    return NextResponse.json({ error: "Invalid work mode" }, { status: 400 });
  }
  if (!employmentTypes.has(String(employmentType))) {
    return NextResponse.json({ error: "Invalid employment type" }, { status: 400 });
  }
  if (!payUnits.has(String(payUnit))) {
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

  const budgetRequired = getJobBudgetRequired(Number(payAmount), Number(openings));
  const budgetDelta =
    existing.status === "PENDING_REVIEW" || existing.status === "REJECTED"
      ? 0
      : getJobBudgetDelta(budgetRequired, existing.lockedBudgetAmount);

  if (budgetDelta > 0) {
    const wallet = await ensureBusinessWalletSynced(existing.businessId);
    if (!wallet || wallet.balance < budgetDelta) {
      return NextResponse.json(
        {
          error: `This business needs at least INR ${budgetDelta.toFixed(2)} more in the wallet before this job can be updated.`,
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (budgetDelta !== 0) {
      await applyJobBudgetDelta(tx, {
        businessId: existing.businessId,
        jobTitle: title,
        budgetDelta,
      });
    }

    const next = await tx.jobPosting.update({
      where: { id: jobId },
      data: {
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
        openings: Number(openings),
        payAmount: Number(payAmount),
        commissionRate: PHYSICAL_WORK_COMMISSION_RATE,
        budgetRequired,
        lockedBudgetAmount:
          existing.status === "PENDING_REVIEW" || existing.status === "REJECTED"
            ? existing.lockedBudgetAmount
            : budgetRequired,
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
        userId: session.user.id,
        action: "ADMIN_JOB_UPDATED",
        entity: "JobPosting",
        details: `jobId=${jobId}, businessId=${existing.businessId}, city=${city}, state=${state}, budgetRequired=${budgetRequired}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        action: "ADMIN_JOB_UPDATED",
        details: `jobId=${jobId}, businessId=${existing.businessId}, city=${city}, state=${state}, status=${existing.status}, budgetRequired=${budgetRequired}`,
      },
    });

    return next;
  });

  return NextResponse.json({ message: "Job updated", job: updated });
}
