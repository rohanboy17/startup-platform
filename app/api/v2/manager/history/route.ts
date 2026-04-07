import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function extractId(details: string | null, key: string) {
  if (!details) return null;
  const match = new RegExp(`${key}=([^,\\s]+)`).exec(details);
  return match?.[1] ?? null;
}

function extractReason(details: string | null) {
  if (!details) return null;
  const split = details.split(", reason=");
  if (split.length < 2) return null;
  return split.slice(1).join(", reason=").trim() || null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50;

  const logs = await prisma.activityLog.findMany({
    where: {
      userId: session.user.id,
      entity: { in: ["Submission", "JobApplication"] },
      action: {
        in: [
          "MANAGER_APPROVED_SUBMISSION",
          "MANAGER_REJECTED_SUBMISSION",
          "MANAGER_ESCALATED_SUBMISSION",
          "MANAGER_APPROVED_JOB_APPLICATION",
          "MANAGER_REJECTED_JOB_APPLICATION",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const submissionIds = Array.from(
    new Set(
      logs
        .filter((log) => log.entity === "Submission")
        .map((log) => extractId(log.details, "submissionId"))
        .filter((value): value is string => Boolean(value))
    )
  );
  const applicationIds = Array.from(
    new Set(
      logs
        .filter((log) => log.entity === "JobApplication")
        .map((log) => extractId(log.details, "applicationId"))
        .filter((value): value is string => Boolean(value))
    )
  );

  const [submissions, applications] = await Promise.all([
    submissionIds.length
      ? prisma.submission.findMany({
          where: { id: { in: submissionIds } },
          include: {
            user: { select: { id: true, name: true, level: true, isSuspicious: true } },
            campaign: { select: { id: true, title: true, category: true, rewardPerTask: true } },
          },
        })
      : Promise.resolve([]),
    applicationIds.length
      ? prisma.jobApplication.findMany({
          where: { id: { in: applicationIds } },
          include: {
            user: { select: { id: true, name: true, level: true, isSuspicious: true } },
            job: {
              select: {
                id: true,
                title: true,
                jobCategory: true,
                city: true,
                state: true,
                payAmount: true,
                business: { select: { id: true, name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const submissionsById = new Map(submissions.map((row) => [row.id, row]));
  const applicationsById = new Map(applications.map((row) => [row.id, row]));

  const rows = logs.map((log) => {
    const reason = extractReason(log.details);

    if (log.entity === "JobApplication") {
      const applicationId = extractId(log.details, "applicationId");
      const application = applicationId ? applicationsById.get(applicationId) : null;
      return {
        id: log.id,
        kind: "JOB_APPLICATION" as const,
        action: log.action,
        createdAt: log.createdAt.toISOString(),
        reason,
        submissionId: null,
        applicationId,
        submission: null,
        application: application
          ? {
              id: application.id,
              createdAt: application.createdAt.toISOString(),
              coverNote: application.coverNote,
              status: application.status,
              managerReason: application.managerReason,
              user: application.user,
              job: {
                ...application.job,
              },
            }
          : null,
      };
    }

    const submissionId = extractId(log.details, "submissionId");
    const submission = submissionId ? submissionsById.get(submissionId) : null;
    return {
      id: log.id,
      kind: "SUBMISSION" as const,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      reason,
      submissionId,
      applicationId: null,
      application: null,
      submission: submission
        ? {
            id: submission.id,
            createdAt: submission.createdAt.toISOString(),
            proofLink: submission.proofLink,
            proofText: submission.proofText,
            proofImage: submission.proofImage,
            proof: submission.proof,
            assignedInstructionSequence: submission.assignedInstructionSequence,
            assignedInstructionText: submission.assignedInstructionText,
            user: submission.user,
            campaign: submission.campaign,
            managerEscalatedAt: submission.managerEscalatedAt
              ? submission.managerEscalatedAt.toISOString()
              : null,
            managerEscalationReason: submission.managerEscalationReason,
          }
        : null,
    };
  });

  return NextResponse.json({ rows });
}
