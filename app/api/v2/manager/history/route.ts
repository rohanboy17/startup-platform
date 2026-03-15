import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function extractSubmissionId(details: string | null) {
  if (!details) return null;
  const match = /submissionId=([^,\s]+)/.exec(details);
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
      entity: "Submission",
      action: { in: ["MANAGER_APPROVED_SUBMISSION", "MANAGER_REJECTED_SUBMISSION", "MANAGER_ESCALATED_SUBMISSION"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const submissionIds = Array.from(
    new Set(
      logs
        .map((log) => extractSubmissionId(log.details))
        .filter((value): value is string => Boolean(value))
    )
  );

  const submissions = submissionIds.length
    ? await prisma.submission.findMany({
        where: { id: { in: submissionIds } },
        include: {
          user: { select: { id: true, name: true, level: true, isSuspicious: true } },
          campaign: { select: { id: true, title: true, category: true, rewardPerTask: true } },
        },
      })
    : [];

  const byId = new Map(submissions.map((row) => [row.id, row]));

  const rows = logs.map((log) => {
    const submissionId = extractSubmissionId(log.details);
    const submission = submissionId ? byId.get(submissionId) : null;
    return {
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      submissionId,
      reason: extractReason(log.details),
      submission: submission
        ? {
            id: submission.id,
            createdAt: submission.createdAt.toISOString(),
            proofLink: submission.proofLink,
            proofText: submission.proofText,
            proofImage: submission.proofImage,
            proof: submission.proof,
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
