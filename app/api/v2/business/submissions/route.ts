import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

function extractReason(details: string | null | undefined) {
  if (!details) return null;
  const match = details.match(/reason=(.*)$/i);
  if (!match) return null;
  const value = match[1]?.trim();
  if (!value || value === "-") return null;
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      campaign: { businessId: context.businessUserId },
      campaignId: { not: null },
    },
    select: {
      id: true,
      proof: true,
      proofLink: true,
      proofText: true,
      proofImage: true,
      managerStatus: true,
      adminStatus: true,
      rewardAmount: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          title: true,
          category: true,
          rewardPerTask: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const submissionIds = submissions.map((item) => item.id);

  const logs = submissionIds.length
    ? await prisma.activityLog.findMany({
        where: {
          entity: "Submission",
          OR: submissionIds.map((id) => ({
            details: { contains: `submissionId=${id}` },
          })),
        },
        select: {
          action: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const reasonMap = new Map<string, { managerReason?: string | null; adminReason?: string | null }>();

  for (const log of logs) {
    const idMatch = log.details?.match(/submissionId=([^,]+)/i);
    const submissionId = idMatch?.[1];
    if (!submissionId) continue;
    const current = reasonMap.get(submissionId) || {};
    const reason = extractReason(log.details);

    if (log.action === "MANAGER_REJECTED_SUBMISSION" && current.managerReason === undefined) {
      current.managerReason = reason;
    }

    if (log.action === "ADMIN_REJECTED_SUBMISSION" && current.adminReason === undefined) {
      current.adminReason = reason;
    }

    reasonMap.set(submissionId, current);
  }

  const rows = submissions.map((submission) => {
    const reasons = reasonMap.get(submission.id);
    const stage =
      submission.adminStatus === "ADMIN_APPROVED"
        ? "APPROVED"
        : submission.adminStatus === "ADMIN_REJECTED"
          ? "ADMIN_REJECTED"
          : submission.managerStatus === "MANAGER_REJECTED"
            ? "MANAGER_REJECTED"
            : submission.managerStatus === "MANAGER_APPROVED"
              ? "PENDING_ADMIN"
              : "PENDING_MANAGER";

    return {
      ...submission,
      stage,
      reason:
        stage === "ADMIN_REJECTED"
          ? reasons?.adminReason || "No admin reason provided"
          : stage === "MANAGER_REJECTED"
            ? reasons?.managerReason || "No manager reason provided"
            : null,
    };
  });

  return NextResponse.json({
    counts: {
      total: rows.length,
      pendingManager: rows.filter((row) => row.stage === "PENDING_MANAGER").length,
      pendingAdmin: rows.filter((row) => row.stage === "PENDING_ADMIN").length,
      approved: rows.filter((row) => row.stage === "APPROVED").length,
      rejected: rows.filter((row) => ["MANAGER_REJECTED", "ADMIN_REJECTED"].includes(row.stage)).length,
    },
    submissions: rows,
  });
}
