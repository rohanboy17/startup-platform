import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getSubmissionStage(input: {
  managerStatus: string;
  adminStatus: string;
}) {
  if (input.adminStatus === "ADMIN_APPROVED" || input.adminStatus === "APPROVED") {
    return "APPROVED";
  }

  if (input.adminStatus === "ADMIN_REJECTED") {
    return "ADMIN_REJECTED";
  }

  if (input.managerStatus === "MANAGER_REJECTED") {
    return "MANAGER_REJECTED";
  }

  if (input.managerStatus === "MANAGER_APPROVED" && input.adminStatus === "PENDING") {
    return "PENDING_ADMIN";
  }

  return "PENDING_MANAGER";
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      userId: session.user.id,
      campaignId: { not: null },
    },
    include: {
      campaign: {
        select: {
          title: true,
          category: true,
          rewardPerTask: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    submissions: submissions.map((submission) => ({
      ...submission,
      stage: getSubmissionStage({
        managerStatus: submission.managerStatus,
        adminStatus: submission.adminStatus,
      }),
    })),
  });
}
